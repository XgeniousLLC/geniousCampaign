import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { google } from 'googleapis';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import {
  contacts,
  emailEvents,
  emailMessages,
  emailThreads,
  scheduledReplies,
  sequenceEnrollments,
  sequenceSettings,
  sequences,
  senderAccounts,
  sends,
  subsequences,
} from '../db/schema';
import { decryptToken } from '../sending/token-encryption.util';
import { gmailAuthClient, gmailTokenSecret } from '../sending/gmail-client.util';
import {
  evaluateConditionTree,
  type ConditionContext,
} from '@genius-campaign/shared';
import {
  classifyReply,
  replyRequestsUnsubscribe,
  replySubject,
  unsubKeywordsFrom,
  type ThreadStatus,
} from './thread-classifier.util';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { AiAssistService } from '../ai-assist/ai-assist.service';
import { SuppressionService } from '../suppression/suppression.service';
import { EnrollmentService } from '../enrollments/enrollment.service';

export type InboxTab = 'all' | 'unread' | 'scheduled';

const AI_STATUSES: ThreadStatus[] = [
  'interested',
  'not_interested',
  'meeting_booked',
  'out_of_office',
  'closed',
  'uncategorized',
];

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly settings: SettingsService,
    private readonly events: EventEmitter2,
    private readonly dispatcher: SendDispatcherService,
    private readonly suppression: SuppressionService,
    private readonly enrollments: EnrollmentService,
    @InjectQueue('subsequence-enroll') private readonly subQueue: Queue,
    @InjectQueue('inbox-scheduled-reply')
    private readonly scheduledQueue: Queue,
    @Optional() private readonly ai?: AiAssistService,
  ) {}

  private gmailClientFor(account: typeof senderAccounts.$inferSelect) {
    const secret = gmailTokenSecret(this.settings);
    if (!account.gmailRefreshTokenEncrypted || !secret)
      throw new Error('Gmail not configured for this account');
    const refreshToken = decryptToken(
      account.gmailRefreshTokenEncrypted,
      secret,
    );
    // Per-mailbox OAuth app when set, else the shared Settings app.
    const client = gmailAuthClient(account, this.settings, secret, refreshToken);
    return google.gmail({ version: 'v1', auth: client });
  }

  private decodeBody(payload: unknown): {
    text: string;
    html?: string;
    headers: Record<string, string>;
  } {
    const headers: Record<string, string> = {};
    let text = '';
    const walk = (part: Record<string, unknown>) => {
      const hdrs = (part.headers ?? []) as Array<{
        name: string;
        value: string;
      }>;
      for (const h of hdrs) headers[h.name] = h.value;
      const mime = part.mimeType as string;
      const body = part.body as { data?: string } | undefined;
      if (body?.data && (mime === 'text/plain' || mime === 'text/html')) {
        const decoded = Buffer.from(body.data, 'base64').toString('utf8');
        if (mime === 'text/plain' && !text) text = decoded;
      }
      for (const sub of (part.parts ?? []) as Array<Record<string, unknown>>)
        walk(sub);
    };
    walk((payload ?? {}) as Record<string, unknown>);
    return { text: text.slice(0, 20000), headers };
  }

  /** Rules first; LLM only for uncategorized mail when INBOX_AI_CLASSIFY is on. */
  private async classifyWithAiFallback(input: {
    subject?: string;
    headers?: Record<string, string>;
    bodyText?: string;
  }): Promise<{
    status: ThreadStatus;
    confidence: number;
    source: 'auto' | 'ai';
  }> {
    const rules = classifyReply(input);
    if (rules.status !== 'uncategorized') return { ...rules, source: 'auto' };
    if (
      !this.ai ||
      !['1', 'true', 'yes'].includes(
        String(this.settings.get('INBOX_AI_CLASSIFY') ?? '').toLowerCase(),
      )
    ) {
      return { ...rules, source: 'auto' };
    }
    try {
      const snippet = (input.bodyText ?? '').slice(0, 2000);
      const raw = await this.ai.generateRaw(
        `Classify this prospect email reply into exactly one word: interested, not_interested, meeting_booked, out_of_office, closed, or uncategorized. ` +
          `Reply with only that word, nothing else.\n\nSubject: ${input.subject ?? '(none)'}\n\n${snippet}`,
      );
      const word = raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z_]/g, '') as ThreadStatus;
      if (AI_STATUSES.includes(word)) {
        return {
          status: word,
          confidence: word === 'uncategorized' ? 0.3 : 0.7,
          source: 'ai',
        };
      }
    } catch (err) {
      this.logger.warn(
        `AI classify failed, keeping uncategorized: ${err instanceof Error ? err.message : err}`,
      );
    }
    return { ...rules, source: 'auto' };
  }

  /** Poll one Gmail account; returns number of new inbound messages ingested. */
  async pollAccount(accountId: string): Promise<number> {
    const account = await this.drizzle.db.query.senderAccounts.findFirst({
      where: eq(senderAccounts.id, accountId),
    });
    if (
      !account ||
      account.provider !== 'gmail' ||
      !account.gmailRefreshTokenEncrypted
    )
      return 0;
    const gmail = this.gmailClientFor(account);
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: 'newer_than:7d -from:me',
      maxResults: 50,
    });
    const msgs = list.data.messages ?? [];
    let ingested = 0;
    for (const m of msgs) {
      try {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: m.id!,
          format: 'full',
        });
        const threadId = full.data.threadId!;
        const fromHeader =
          full.data.payload?.headers?.find(
            (h) => h.name?.toLowerCase() === 'from',
          )?.value ?? '';
        if (fromHeader.toLowerCase().includes(account.email.toLowerCase()))
          continue;
        // Only threads we sent from (replied-only inbox).
        const sent = await this.drizzle.db.query.sends.findFirst({
          where: eq(sends.providerThreadId, threadId),
        });
        if (!sent) continue;
        const exists = await this.drizzle.db.query.emailMessages.findFirst({
          where: eq(emailMessages.providerMessageId, full.data.id!),
        });
        if (exists) continue;
        const subject =
          full.data.payload?.headers?.find(
            (h) => h.name?.toLowerCase() === 'subject',
          )?.value ?? '';
        const { text, headers } = this.decodeBody(full.data.payload);
        await this.ingestInbound({
          providerThreadId: threadId,
          providerMessageId: full.data.id!,
          subject,
          fromEmail: fromHeader,
          toEmail: account.email,
          snippet: full.data.snippet ?? '',
          bodyText: text,
          headers,
          sent,
          // The mailbox we polled is the one that owns this Gmail thread —
          // authoritative, unlike the old headroom/sequence heuristic.
          mailboxAccountId: account.id,
          sentAt: full.data.internalDate
            ? new Date(Number(full.data.internalDate))
            : new Date(),
        });
        ingested++;
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        this.logger.warn(
          `poll msg ${m.id} failed: ${err instanceof Error ? err.message : err}`,
        );
      }
      if (ingested >= 200) break;
    }
    return ingested;
  }

  async ingestInbound(input: {
    providerThreadId: string;
    providerMessageId: string;
    subject: string;
    fromEmail: string;
    toEmail: string;
    snippet: string;
    bodyText: string;
    headers: Record<string, string>;
    sent: typeof sends.$inferSelect;
    /** The Gmail mailbox this thread was polled from — the account that
     * actually owns the thread, so replies go out from the same mailbox. */
    mailboxAccountId?: string;
    sentAt: Date;
  }) {
    const { status, confidence, source } = await this.classifyWithAiFallback({
      subject: input.subject,
      headers: input.headers,
      bodyText: input.bodyText,
    });
    let thread = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.providerThreadId, input.providerThreadId),
    });
    if (!thread) {
      // Backfill owning enrollment/contact from the matched send.
      const [created] = await this.drizzle.db
        .insert(emailThreads)
        .values({
          providerThreadId: input.providerThreadId,
          enrollmentId: input.sent.sequenceEnrollmentId,
          sequenceId: input.sent.sequenceId,
          contactId: input.sent.contactId,
          senderAccountId:
            input.mailboxAccountId ??
            (await this.senderAccountIdForSend(input.sent)),
          subject: input.subject,
          status,
          statusSource: 'auto',
          statusConfidence: String(confidence),
          lastInboundAt: input.sentAt,
        })
        .returning();
      thread = created;
      // Backfill outbound messages from sends in this thread.
      const outs = await this.drizzle.db.query.sends.findMany({
        where: eq(sends.providerThreadId, input.providerThreadId),
      });
      for (const o of outs) {
        await this.drizzle.db
          .insert(emailMessages)
          .values({
            threadId: thread.id,
            providerMessageId: `send:${o.id}`,
            dir: 'out',
            fromEmail: '',
            toEmail: '',
            snippet: o.resolvedSubject,
            bodyText: o.resolvedBodyText,
            sentAt: o.sentAt ?? o.createdAt,
          })
          .onConflictDoNothing();
      }
    }
    await this.drizzle.db
      .insert(emailMessages)
      .values({
        threadId: thread.id,
        providerMessageId: input.providerMessageId,
        dir: 'in',
        fromEmail: input.fromEmail.slice(0, 500),
        toEmail: input.toEmail.slice(0, 500),
        snippet: input.snippet.slice(0, 1000),
        bodyText: input.bodyText,
        sentAt: input.sentAt,
      })
      .onConflictDoNothing();

    // Auto-status: manual wins forever.
    if (
      thread.statusSource !== 'manual' &&
      (thread.status === 'uncategorized' ||
        confidence > Number(thread.statusConfidence ?? 0))
    ) {
      await this.drizzle.db
        .update(emailThreads)
        .set({
          status,
          statusSource: source,
          statusConfidence: String(confidence),
          lastInboundAt: input.sentAt,
          updatedAt: new Date(),
        })
        .where(eq(emailThreads.id, thread.id));
      thread = { ...thread, status, lastInboundAt: input.sentAt };
    } else {
      await this.drizzle.db
        .update(emailThreads)
        .set({ lastInboundAt: input.sentAt, updatedAt: new Date() })
        .where(eq(emailThreads.id, thread.id));
    }
    this.events.emit('inbox.received', {
      threadId: thread.id,
      providerThreadId: input.providerThreadId,
      status,
      enrollmentId: thread.enrollmentId,
      sequenceId: thread.sequenceId,
      contactId: thread.contactId,
      bodyText: input.bodyText,
    });
    // "Not interested" opts the prospect out everywhere: suppress the email
    // (blocks every future send in every sequence via the runner's
    // suppression gate) and stop all their other active enrollments.
    if (status === 'not_interested') {
      await this.applyNotInterested(thread.id);
    }
    // Auto opt-out: a reply that is essentially just "stop" (or a configured
    // keyword) unsubscribes the prospect even if the classifier left it
    // uncategorized.
    await this.autoUnsubscribeFromReply(thread, input.bodyText);
    return thread;
  }

  /** Suppresses the contact and stops their enrollments when a reply matches
   * the sequence's unsubscribe keywords. Gated by settings.unsubOnReply. */
  private async autoUnsubscribeFromReply(
    thread: typeof emailThreads.$inferSelect,
    bodyText: string | undefined,
  ): Promise<void> {
    if (!thread.sequenceId || !thread.contactId) return;
    const st = await this.drizzle.db.query.sequenceSettings.findFirst({
      where: eq(sequenceSettings.sequenceId, thread.sequenceId),
    });
    if (st && st.unsubOnReply === false) return;
    const keywords = unsubKeywordsFrom(st?.unsubKeywords);
    if (!replyRequestsUnsubscribe(bodyText ?? '', keywords)) return;

    const contact = await this.drizzle.db.query.contacts.findFirst({
      where: eq(contacts.id, thread.contactId),
    });
    if (!contact) return;
    const already = await this.suppression.isSuppressed(contact.email);
    await this.suppression.suppress(
      contact.email,
      'manual_unsubscribe',
      'reply:keyword',
    );
    await this.enrollments.stopAllForContact(contact.id);
    if (!already) {
      this.logger.log(
        `Auto-unsubscribed ${contact.email} (reply matched unsubscribe keyword)`,
      );
    }
    this.events.emit('inbox.unsubscribed_by_reply', {
      threadId: thread.id,
      contactId: contact.id,
      sequenceId: thread.sequenceId,
    });
  }

  /** Idempotent — suppress() returns the existing row and
   * stopAllForContact only touches active/paused enrollments. */
  async applyNotInterested(threadId: string) {
    const thread = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, threadId),
    });
    if (!thread?.contactId) return;
    const contact = await this.drizzle.db.query.contacts.findFirst({
      where: eq(contacts.id, thread.contactId),
    });
    if (!contact) return;
    await this.suppression.suppress(
      contact.email,
      'not_interested',
      'inbox:status',
    );
    await this.enrollments.stopAllForContact(contact.id);
    this.events.emit('inbox.not_interested', {
      threadId,
      contactId: contact.id,
    });
  }

  private async senderAccountIdForSend(
    sent: typeof sends.$inferSelect,
  ): Promise<string | null> {
    // Authoritative: the account that actually sent this email (recorded by
    // the dispatcher at send time). A sequence can rotate across several
    // senders, so sequence.senderAccountId is only a hint — using it for a
    // thread whose mail came from a different mailbox makes Gmail replies
    // 404 ("Requested entity was not found").
    if (sent.senderAccountId) return sent.senderAccountId;
    if (sent.sequenceId) {
      const seq = await this.drizzle.db.query.sequences.findFirst({
        where: eq(sequences.id, sent.sequenceId),
      });
      if (seq?.senderAccountId) return seq.senderAccountId;
    }
    // Fallback: account with most headroom (same rule as dispatcher).
    const accounts = await this.drizzle.db.query.senderAccounts.findMany();
    const gmail = accounts.filter((a) => a.provider === 'gmail' && a.isActive);
    if (gmail.length === 0) return null;
    gmail.sort(
      (a, b) =>
        b.dailySendLimit - b.sentToday - (a.dailySendLimit - a.sentToday),
    );
    return gmail[0].id;
  }

  async listThreads(params: {
    tab?: InboxTab;
    status?: string;
    sequenceId?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 100);
    const offset = params.offset ?? 0;
    const conds: SQL[] = [];
    if (params.tab === 'unread') {
      conds.push(sql`${emailThreads.isRead} = false`);
    }
    if (params.status)
      conds.push(eq(emailThreads.status, params.status as ThreadStatus));
    if (params.sequenceId)
      conds.push(eq(emailThreads.sequenceId, params.sequenceId));
    if (params.q) {
      const q = params.q;
      conds.push(
        or(
          ilike(emailThreads.subject, `%${q}%`),
          ilike(contacts.email, `%${q}%`),
        ) as SQL,
      );
    }
    const where = conds.length ? and(...conds) : undefined;
    const rows = await this.drizzle.db
      .select({
        thread: emailThreads,
        contactEmail: contacts.email,
        contactFirst: contacts.firstName,
        contactLast: contacts.lastName,
      })
      .from(emailThreads)
      .leftJoin(contacts, eq(contacts.id, emailThreads.contactId))
      .where(where)
      .orderBy(desc(emailThreads.lastInboundAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await this.drizzle.db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(emailThreads)
      .where(where ?? sql`true`);
    return {
      threads: rows.map((r) => ({
        ...r.thread,
        unread: !r.thread.isRead,
        contact: r.contactEmail
          ? {
              email: r.contactEmail,
              firstName: r.contactFirst,
              lastName: r.contactLast,
            }
          : null,
      })),
      total: count,
      limit,
      offset,
    };
  }

  async getThread(id: string) {
    const thread = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, id),
    });
    if (!thread) throw new Error(`Thread ${id} not found`);
    const messages = await this.drizzle.db.query.emailMessages.findMany({
      where: eq(emailMessages.threadId, id),
      orderBy: (m, { asc }) => asc(m.sentAt),
    });
    const contact = thread.contactId
      ? await this.drizzle.db.query.contacts.findFirst({
          where: eq(contacts.id, thread.contactId),
        })
      : null;
    return { thread, messages, contact };
  }

  async patchThread(
    id: string,
    dto: { isRead?: boolean; isStarred?: boolean; isFinished?: boolean },
  ) {
    const [updated] = await this.drizzle.db
      .update(emailThreads)
      .set({
        ...dto,
        ...(dto.isRead ? { lastSeenAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(emailThreads.id, id))
      .returning();
    return updated;
  }

  async setStatus(id: string, status: ThreadStatus) {
    const prev = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, id),
    });
    const [updated] = await this.drizzle.db
      .update(emailThreads)
      .set({ status, statusSource: 'manual', updatedAt: new Date() })
      .where(eq(emailThreads.id, id))
      .returning();
    this.events.emit('inbox.status_changed', {
      threadId: id,
      old: prev?.status,
      new: status,
      source: 'manual',
    });
    if (status === 'not_interested') {
      await this.applyNotInterested(id);
    }
    return updated;
  }

  private assertReplyInput(input: {
    html: string;
    text: string;
    cc?: string;
    bcc?: string;
  }) {
    if (!input.text?.trim() && !input.html?.trim()) {
      throw new Error('Reply body must not be empty');
    }
    for (const list of [input.cc, input.bcc]) {
      if (!list?.trim()) continue;
      const emails = list
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (emails.length > 5) throw new Error('Cc/Bcc supports max 5 addresses');
      for (const e of emails) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
          throw new Error(`Invalid email: ${e}`);
      }
    }
  }

  async scheduleReply(
    id: string,
    input: {
      html: string;
      text: string;
      cc?: string;
      bcc?: string;
      sendAt: string;
    },
  ) {
    const thread = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, id),
    });
    if (!thread) throw new Error('Thread not found');
    if (thread.isFinished) throw new Error('Thread is finished');
    this.assertReplyInput(input);
    const sendAt = new Date(input.sendAt);
    if (Number.isNaN(sendAt.getTime()) || sendAt.getTime() <= Date.now()) {
      throw new Error('sendAt must be a future date');
    }
    const [row] = await this.drizzle.db
      .insert(scheduledReplies)
      .values({
        threadId: id,
        html: input.html,
        text: input.text,
        cc: input.cc,
        bcc: input.bcc,
        sendAt,
      })
      .returning();
    await this.scheduledQueue.add(
      'send',
      { scheduledReplyId: row.id, threadId: id },
      {
        delay: sendAt.getTime() - Date.now(),
        jobId: `sched-reply-${row.id}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
    return row;
  }

  async listScheduled() {
    return this.drizzle.db.query.scheduledReplies.findMany({
      where: eq(scheduledReplies.status, 'pending'),
      orderBy: (s, { asc }) => asc(s.sendAt),
    });
  }

  async unreadCount() {
    const [row] = await this.drizzle.db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(emailThreads)
      .where(eq(emailThreads.isRead, false));
    return { unread: row?.count ?? 0 };
  }

  async cancelScheduled(replyId: string) {
    const [updated] = await this.drizzle.db
      .update(scheduledReplies)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(scheduledReplies.id, replyId))
      .returning();
    return updated;
  }

  /** Which mailbox must send a thread's reply — the Gmail thread only exists
   * inside the mailbox that sent the original, so picking the wrong account
   * makes messages.send fail with "Requested entity was not found". Prefers
   * the recorded sender of the thread's sends, then the mailbox that received
   * the inbound reply, and only then the (possibly stale/heuristic) value
   * stored on the thread. */
  private async resolveReplySenderAccountId(
    thread: typeof emailThreads.$inferSelect,
  ): Promise<string | undefined> {
    const sent = await this.drizzle.db.query.sends.findFirst({
      where: eq(sends.providerThreadId, thread.providerThreadId),
    });
    if (sent?.senderAccountId) return sent.senderAccountId;

    const inbound = await this.drizzle.db.query.emailMessages.findFirst({
      where: and(
        eq(emailMessages.threadId, thread.id),
        eq(emailMessages.dir, 'in'),
      ),
      orderBy: (m, { desc }) => desc(m.sentAt),
    });
    if (inbound?.toEmail) {
      const acct = await this.drizzle.db.query.senderAccounts.findFirst({
        where: and(
          eq(senderAccounts.provider, 'gmail'),
          eq(senderAccounts.email, inbound.toEmail),
        ),
      });
      if (acct) return acct.id;
    }
    return thread.senderAccountId ?? undefined;
  }

  async replyToThread(
    id: string,
    input: { html: string; text: string; cc?: string; bcc?: string },
  ) {
    const thread = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, id),
    });
    if (!thread) throw new Error('Thread not found');
    if (thread.isFinished) throw new Error('Thread is finished');
    this.assertReplyInput(input);
    const contact = thread.contactId
      ? await this.drizzle.db.query.contacts.findFirst({
          where: eq(contacts.id, thread.contactId),
        })
      : null;
    if (!contact) throw new Error('Contact not found');
    // Same send gate as campaign/sequence sends: never reply to a contact
    // whose status is suppressed/unsubscribed/bounced or whose email is on
    // the suppression list.
    const statusBlocked =
      contact.status === 'suppressed' ||
      contact.status === 'unsubscribed' ||
      contact.status === 'bounced';
    if (statusBlocked || (await this.suppression.isSuppressed(contact.email))) {
      throw new Error(
        statusBlocked
          ? `Cannot reply: ${contact.email} has status "${contact.status}"`
          : `Cannot reply: ${contact.email} is on the suppression list`,
      );
    }
    // Resolve {{firstName}} style tokens from contact — non-scalar fields
    // resolve to '' rather than '[object Object]'.
    const resolveToken = (key: string): string => {
      const v: unknown = (contact as unknown as Record<string, unknown>)[key];
      return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
    };
    const text = input.text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
      resolveToken(k),
    );
    const html = input.html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
      resolveToken(k),
    );
    // Last gmail message id for threading headers.
    const lastIn = await this.drizzle.db.query.emailMessages.findMany({
      where: and(eq(emailMessages.threadId, id), eq(emailMessages.dir, 'in')),
      orderBy: (m, { desc }) => desc(m.sentAt),
    });
    // Send from the mailbox that owns this Gmail thread, not whatever
    // account the dispatcher's quota rotation would otherwise pick.
    const senderAccountId = await this.resolveReplySenderAccountId(thread);
    const result = await this.dispatcher.send({
      to: contact.email,
      subject: replySubject(thread.subject),
      html,
      text,
      // Manual 1:1 reply — no bulk List-Unsubscribe headers.
      senderAccountId,
      threadId: thread.providerThreadId,
      inReplyToMessageId: lastIn[0]?.providerMessageId?.startsWith('send:')
        ? undefined
        : lastIn[0]?.providerMessageId,
      cc: input.cc,
      bcc: input.bcc,
    });
    await this.drizzle.db.insert(emailMessages).values({
      threadId: id,
      providerMessageId: result.providerMessageId,
      dir: 'out',
      fromEmail: '',
      toEmail: contact.email,
      snippet: text.slice(0, 200),
      bodyText: text,
      bodyHtml: html,
      sentAt: new Date(),
    });
    await this.drizzle.db
      .update(emailThreads)
      .set({ isRead: true, lastSeenAt: new Date() })
      .where(eq(emailThreads.id, id));
    this.events.emit('inbox.replied', { threadId: id, contactId: contact.id });
    return { ok: true, providerMessageId: result.providerMessageId };
  }

  /** T08 — route inbox/open/click events into child sequences. */
  async evaluateSubsequence(
    threadId: string,
    event: { kind: string; bodyText?: string },
  ) {
    const thread = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, threadId),
    });
    if (!thread?.sequenceId || !thread.contactId) return null;
    const parentSettings =
      await this.drizzle.db.query.sequenceSettings.findFirst({
        where: eq(sequenceSettings.sequenceId, thread.sequenceId),
      });
    const rules = await this.drizzle.db.query.subsequences.findMany({
      where: eq(subsequences.parentSequenceId, thread.sequenceId),
    });
    if (rules.length === 0) return null;
    const ctx = await this.buildSubsequenceContext(thread, event);
    for (const rule of rules) {
      if (!evaluateConditionTree(rule.conditions, ctx)) continue;
      if (parentSettings?.triggerOnce) {
        // One subsequence per prospect per parent: skip if already routed.
        const prior = await this.drizzle.db.query.sequenceEnrollments.findFirst(
          {
            where: and(
              eq(sequenceEnrollments.sequenceId, rule.childSequenceId),
              eq(sequenceEnrollments.contactId, thread.contactId),
            ),
          },
        );
        if (prior) {
          this.events.emit('subsequence.skipped', {
            threadId,
            ruleId: rule.id,
          });
          continue;
        }
      }
      if (rule.stopParent && thread.enrollmentId) {
        await this.drizzle.db
          .update(sequenceEnrollments)
          .set({
            status: 'stopped',
            currentStepId: null,
            nextRunAt: null,
            updatedAt: new Date(),
          })
          .where(eq(sequenceEnrollments.id, thread.enrollmentId));
      }
      const delayMs = Number(rule.delayMs ?? '0') || 0;
      await this.subQueue.add(
        'enroll',
        {
          threadId,
          ruleId: rule.id,
          childSequenceId: rule.childSequenceId,
          contactId: thread.contactId,
        },
        {
          delay: delayMs,
          jobId: `subseq-${threadId}-${rule.id}`,
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
      this.events.emit('subsequence.scheduled', {
        threadId,
        ruleId: rule.id,
        childSequenceId: rule.childSequenceId,
        delayMs,
      });
      return {
        ruleId: rule.id,
        childSequenceId: rule.childSequenceId,
        scheduled: true,
      };
    }
    return null;
  }

  /** Snapshot of everything a subsequence condition can test against. */
  private async buildSubsequenceContext(
    thread: typeof emailThreads.$inferSelect,
    event: { kind: string; bodyText?: string },
  ): Promise<ConditionContext> {
    const rows = await this.drizzle.db
      .select({ type: emailEvents.type, url: emailEvents.url })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .where(eq(sends.providerThreadId, thread.providerThreadId));
    let openCount = 0;
    const clickedUrls: string[] = [];
    for (const r of rows) {
      if (r.type === 'open') openCount += 1;
      else if (r.type === 'click') clickedUrls.push(r.url ?? '');
    }

    let replyText = event.bodyText ?? '';
    if (!replyText) {
      const last = await this.drizzle.db.query.emailMessages.findFirst({
        where: and(
          eq(emailMessages.threadId, thread.id),
          eq(emailMessages.dir, 'in'),
        ),
        orderBy: (m, { desc }) => desc(m.sentAt),
      });
      replyText = last?.bodyText ?? '';
    }

    let lastStepNumber = 0;
    if (thread.enrollmentId) {
      const [sent] = await this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(sends)
        .where(
          and(
            eq(sends.sequenceEnrollmentId, thread.enrollmentId),
            eq(sends.status, 'sent'),
          ),
        );
      lastStepNumber = sent?.count ?? 0;
    }

    return {
      openCount,
      clickCount: clickedUrls.length,
      clickedUrls,
      replied: event.kind === 'reply' || thread.lastInboundAt != null,
      outcome: thread.status,
      replyText,
      lastStepNumber,
    };
  }
}
