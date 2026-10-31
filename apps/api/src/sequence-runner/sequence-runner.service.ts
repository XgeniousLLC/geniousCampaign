import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import {
  sequenceEnrollments,
  sequenceSenders,
  sequenceSteps,
  sequenceStepTemplates,
  sequenceSettings,
  sendingSchedules,
  sequences,
  contacts,
  templates,
  sends,
  verificationResults,
} from '../db/schema';
import {
  resolveNextExecutableStep,
  type RunnerStep,
} from './step-resolution.util';
import { resolveTemplateContent } from '@genius-campaign/shared';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { SenderAccountService } from '../sending/sender-account.service';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { rewriteLinksForTracking } from '../tracking/rewrite-links.util';
import { signUnsubscribeToken } from '../sending/unsubscribe-token.util';
import { EventEmitter2 } from '@nestjs/event-emitter';

const DEFAULT_UNSUB_MESSAGE =
  "Reply 'Stop' if you'd prefer not to receive messages at this time.";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class SequenceRunnerService {
  private readonly logger = new Logger(SequenceRunnerService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly settings: SettingsService,
    private readonly sendDispatcher: SendDispatcherService,
    private readonly senderAccounts: SenderAccountService,
    private readonly suppression: SuppressionService,
    private readonly tracking: TrackingService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * One tick: find every active enrollment whose nextRunAt is due, and
   * process each. Each enrollment re-checks its own status immediately
   * before executing (CLAUDE.md invariant 3) — this is what makes pause
   * take effect within one tick without needing to cancel a queued job.
   *
   * Sending priority (sequence_settings.priority) decides the order when a
   * backlog is due, and SEQUENCE_TICK_BUDGET caps sends per tick so the
   * order is meaningful (default 500 — far above normal Gmail throughput).
   */
  async tick(): Promise<{ processed: number }> {
    const now = new Date();
    const due = await this.drizzle.db
      .select()
      .from(sequenceEnrollments)
      .where(
        and(
          eq(sequenceEnrollments.status, 'active'),
          lte(sequenceEnrollments.nextRunAt, now),
        ),
      );

    const ordered = await this.orderByPriority(due);
    const budget = Number(process.env.SEQUENCE_TICK_BUDGET ?? 500) || 500;

    let processed = 0;
    let spent = 0;
    for (const { e: enrollment, p: priority } of ordered) {
      if (spent >= budget) break;
      await this.processOne(enrollment.id, now);
      processed++;
      // Aggressive sequences consume half budget per send, so new-prospect
      // heavy sequences drain a backlog roughly twice as fast.
      spent += priority === 'aggressive' ? 0.5 : 1;
    }
    return { processed };
  }

  /** Sort due enrollments by each sequence's priority mode. */
  private async orderByPriority(
    due: (typeof sequenceEnrollments.$inferSelect)[],
  ): Promise<Array<{ e: typeof sequenceEnrollments.$inferSelect; p: string }>> {
    if (due.length === 0) return [];
    const sequenceIds = [...new Set(due.map((e) => e.sequenceId))];
    const [settingsRows, stepRows] = await Promise.all([
      this.drizzle.db
        .select()
        .from(sequenceSettings)
        .where(inArray(sequenceSettings.sequenceId, sequenceIds)),
      this.drizzle.db
        .select()
        .from(sequenceSteps)
        .where(inArray(sequenceSteps.sequenceId, sequenceIds)),
    ]);
    const priorityBySeq = new Map(
      settingsRows.map((s) => [s.sequenceId, s.priority]),
    );
    // Send-step index per step id (position among send_email steps only).
    const indexByStep = new Map<string, number>();
    for (const seqId of sequenceIds) {
      const sendSteps = stepRows
        .filter((s) => s.sequenceId === seqId && s.type === 'send_email')
        .sort((a, b) => a.order - b.order);
      sendSteps.forEach((s, i) => indexByStep.set(s.id, i));
    }
    const stepIndex = (e: typeof sequenceEnrollments.$inferSelect): number =>
      e.currentStepId ? (indexByStep.get(e.currentStepId) ?? 0) : 0;
    const dueAt = (e: typeof sequenceEnrollments.$inferSelect) =>
      e.nextRunAt?.getTime() ?? 0;
    const withP = due.map((e) => ({
      e,
      p: priorityBySeq.get(e.sequenceId) ?? 'followups',
    }));
    return withP.sort((a, b) => {
      // Same-sequence ties always FIFO.
      if (a.e.sequenceId === b.e.sequenceId) return dueAt(a.e) - dueAt(b.e);
      const rank = (x: (typeof withP)[number]) => {
        switch (x.p) {
          case 'new':
          case 'aggressive':
            return -stepIndex(x.e); // first-step enrollments first
          case 'balanced':
            return 0; // pure FIFO across sequences (falls through to dueAt)
          case 'followups':
          default:
            return stepIndex(x.e); // deepest follow-ups first
        }
      };
      return rank(a) - rank(b) || dueAt(a.e) - dueAt(b.e);
    });
  }

  private async processOne(enrollmentId: string, now: Date) {
    // Re-check status immediately before executing — invariant 3.
    const fresh = await this.drizzle.db.query.sequenceEnrollments.findFirst({
      where: eq(sequenceEnrollments.id, enrollmentId),
    });
    if (!fresh || fresh.status !== 'active' || !fresh.currentStepId) return;

    // T07 — sending schedule window: skip outside hours, retry next tick.
    const schedOk = await this.withinSchedule(fresh.sequenceId, now);
    if (!schedOk) return;

    const step = await this.drizzle.db.query.sequenceSteps.findFirst({
      where: eq(sequenceSteps.id, fresh.currentStepId),
    });
    if (!step) return;

    try {
      if (step.type === 'exit') {
        await this.drizzle.db
          .update(sequenceEnrollments)
          .set({
            status: 'completed',
            currentStepId: null,
            nextRunAt: null,
            updatedAt: now,
          })
          .where(eq(sequenceEnrollments.id, enrollmentId));
        this.events.emit('sequence.completed', {
          enrollmentId,
          sequenceId: fresh.sequenceId,
          contactId: fresh.contactId,
        });
        return;
      }

      if (step.type === 'send_email') {
        await this.executeSendEmail(fresh, step);
      }
      // A sequence step of type 'condition' (branch mid-sequence) always
      // passes through for now — no ticket has specified its real branching
      // logic yet. Not to be confused with GC-035's trigger engine, which is
      // a separate concept: auto-enrolling a contact into a sequence from an
      // external event, not a conditional step inside an already-running one.

      await this.advance(
        fresh.sequenceId,
        fresh.contactId,
        enrollmentId,
        step.order,
        now,
      );
    } catch (err) {
      this.logger.error(
        `Sequence runner failed processing enrollment ${enrollmentId} at step ${step.id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async executeSendEmail(
    enrollment: typeof sequenceEnrollments.$inferSelect,
    step: typeof sequenceSteps.$inferSelect,
  ) {
    const contact = await this.drizzle.db.query.contacts.findFirst({
      where: eq(contacts.id, enrollment.contactId),
    });
    if (!contact) return;

    // Sender + settings resolve from the ROOT parent for subsequence children
    // (inherited live); a child's own settings contribute only its schedule.
    const {
      sequence,
      rootSequenceId,
      settings: seqSettings,
    } = await this.effectiveContext(enrollment.sequenceId);

    // A step can link several templates (sequence_step_templates) — pick one
    // uniformly at random per send, true A/B, replacing the old
    // template-level parentTemplateId variant system.
    const links = await this.drizzle.db
      .select({ templateId: sequenceStepTemplates.templateId })
      .from(sequenceStepTemplates)
      .where(eq(sequenceStepTemplates.sequenceStepId, step.id));
    if (links.length === 0) {
      await this.recordFailedSend(
        enrollment,
        step,
        contact.id,
        'Step has no template configured',
      );
      return;
    }
    const pickedTemplateId =
      links[Math.floor(Math.random() * links.length)].templateId;
    const template = await this.drizzle.db.query.templates.findFirst({
      where: eq(templates.id, pickedTemplateId),
    });
    if (!template) {
      await this.recordFailedSend(
        enrollment,
        step,
        contact.id,
        `Template ${pickedTemplateId} not found`,
      );
      return;
    }

    // Two independent gates: suppression_list and contact.status — a
    // contact can carry status 'suppressed'/'unsubscribed'/'bounced' without a
    // matching suppression_list row and must still never receive a send.
    const statusBlocked =
      contact.status === 'suppressed' ||
      contact.status === 'unsubscribed' ||
      contact.status === 'bounced';
    if (statusBlocked || (await this.suppression.isSuppressed(contact.email))) {
      await this.drizzle.db.insert(sends).values({
        contactId: contact.id,
        templateId: template.id,
        sequenceEnrollmentId: enrollment.id,
        sequenceId: enrollment.sequenceId,
        sequenceStepId: step.id,
        provider: 'ses',
        resolvedSubject: template.subjectLines[0] ?? '',
        resolvedPreviewText: template.previewTextLines[0] ?? null,
        resolvedBodyHtml: template.bodyHtml,
        resolvedBodyText: template.bodyText,
        status: 'suppressed',
        error: statusBlocked
          ? `${contact.email} has status "${contact.status}"`
          : `${contact.email} is on the suppression list`,
      });
      return;
    }

    // Personalization tokens ({{contact.x}}) are resolved before spintax —
    // spintax's own {a|b} brace parser would otherwise mis-parse the doubled
    // braces of an unresolved token as a nested spintax group and eat them.
    // Spintax itself is resolved once per send, here, never at save time
    // (invariant 5) — resolveTemplateContent() also picks the random
    // subject/preview-text line as the outer step, same ordering.
    const resolved = resolveTemplateContent(template, contact);
    const resolvedSubject = resolved.subject;
    let resolvedBodyHtmlRaw = resolved.bodyHtml;
    let resolvedBodyText = resolved.bodyText;

    // T09 — per-sequence safety/render toggles (seqSettings already resolved
    // above, inherited from the root parent for subsequence children).
    const trackOpen = seqSettings?.trackOpen !== false;
    const trackClick = seqSettings?.trackClick !== false;
    if (seqSettings?.stripStyling) {
      resolvedBodyHtmlRaw = resolvedBodyHtmlRaw
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/\sstyle="[^"]*"/gi, '')
        .replace(/<font[\s\S]*?>([\s\S]*?)<\/font>/gi, '$1')
        // The strip above also removed the image width guard — re-apply it so a
        // wide upload can't overflow the body with "remove styling" enabled.
        .replace(/<img\b/gi, '<img style="max-width:100%;height:auto;display:block" ');
    }
    // T09 — verification gate: never send risky/undeliverable when enabled.
    if (seqSettings?.verifyBeforeSend) {
      const vr = await this.drizzle.db.query.verificationResults.findFirst({
        where: eq(verificationResults.email, contact.email),
      });
      if (
        vr &&
        (!vr.isDeliverable || vr.status === 'invalid' || vr.status === 'risky')
      ) {
        await this.drizzle.db.insert(sends).values({
          contactId: contact.id,
          templateId: template.id,
          sequenceEnrollmentId: enrollment.id,
          sequenceId: enrollment.sequenceId,
          sequenceStepId: step.id,
          provider: 'ses',
          resolvedSubject,
          resolvedPreviewText: resolved.previewText || null,
          resolvedBodyHtml: resolvedBodyHtmlRaw,
          resolvedBodyText,
          status: 'suppressed',
          error: `verification gate: ${vr.status}`,
        });
        return;
      }
    }

    const sendId = randomUUID();
    const htmlWithClickTracking = trackClick
      ? rewriteLinksForTracking(resolvedBodyHtmlRaw, (url) =>
          this.tracking.buildClickUrl(sendId, url),
        )
      : resolvedBodyHtmlRaw;
    const resolvedBodyHtml = trackOpen
      ? `${htmlWithClickTracking}<img src="${this.tracking.buildOpenPixelUrl(sendId)}" width="1" height="1" alt="" style="display:none" />`
      : htmlWithClickTracking;
    let bodyHtml = resolvedBodyHtml;

    const trackingSecret = this.settings.get('TRACKING_SIGNING_SECRET');
    const unsubscribeUrl = trackingSecret
      ? `${this.tracking.baseUrl}/unsubscribe/${signUnsubscribeToken(trackingSecret, contact.email)}`
      : '#';

    // T01 unsubFooter — text/link format. The List-Unsubscribe header is
    // toggled separately (unsubHeader) so the footer can stay while the
    // header is off. Appended after click-tracking so the opt-out link is
    // never rewritten.
    if (seqSettings?.unsubFooter !== false) {
      const message =
        (seqSettings?.unsubMessage ?? '').trim() || DEFAULT_UNSUB_MESSAGE;
      if ((seqSettings?.unsubFormat ?? 'text') === 'link') {
        if (unsubscribeUrl !== '#') {
          resolvedBodyText += `\n\n---\nUnsubscribe: ${unsubscribeUrl}`;
          bodyHtml += `<p style="margin-top:16px;font-size:12px;color:#6b7280"><a href="${unsubscribeUrl}" style="color:#6b7280">Unsubscribe</a></p>`;
        }
      } else {
        resolvedBodyText += `\n\n---\n${message}`;
        if (unsubscribeUrl !== '#') {
          resolvedBodyText += `\nUnsubscribe: ${unsubscribeUrl}`;
        }
        bodyHtml += `<p style="margin-top:16px;font-size:12px;color:#6b7280">${escapeHtml(message)}${
          unsubscribeUrl !== '#'
            ? ` <a href="${unsubscribeUrl}" style="color:#6b7280">Unsubscribe</a>`
            : ''
        }</p>`;
      }
    }

    // T02 — thread reuse: empty subject reuses the enrollment thread. A step
    // with threadedReply forces the send into that same thread even when its
    // template carries its own subject.
    const priorThread = await this.drizzle.db.query.sends.findFirst({
      where: and(
        eq(sends.sequenceEnrollmentId, enrollment.id),
        eq(sends.status, 'sent'),
      ),
      orderBy: (s, { desc }) => desc(s.createdAt),
    });
    const threadReplies = step.threadedReply === true;
    const useThread =
      (threadReplies || !resolvedSubject.trim()) &&
      priorThread?.providerThreadId
        ? priorThread.providerThreadId
        : undefined;
    const lastMsgId = useThread
      ? (priorThread?.providerMessageId ?? undefined)
      : undefined;
    // Carrying the original subject (prefixed "Re:") keeps the reply inside
    // the existing thread for clients that thread on Subject/References.
    let sendSubject = resolvedSubject;
    if (useThread) {
      const base =
        resolvedSubject.trim() || priorThread?.resolvedSubject?.trim() || '';
      sendSubject = base && !/^re:/i.test(base) ? `Re: ${base}` : base;
    }

    // T09 — text-only modes.
    const sendStepIndex = await this.sendStepIndex(
      enrollment.sequenceId,
      step.id,
    );
    const textOnlyMode = seqSettings?.textOnlyMode ?? 'off';
    const forceTextOnly =
      textOnlyMode === 'all' ||
      (textOnlyMode === 'first_only' && sendStepIndex === 0);

    // Sticky multi-sender: the account that sent this enrollment's first
    // step sends every later step too (pinned on the enrollment row).
    let senderAccountId: string | undefined;
    try {
      senderAccountId = await this.resolveSenderAccount(
        enrollment,
        sequence,
        rootSequenceId,
      );
    } catch (err) {
      await this.recordFailedSend(
        enrollment,
        step,
        contact.id,
        err instanceof Error ? err.message : String(err),
      );
      return;
    }

    await this.drizzle.db.insert(sends).values({
      id: sendId,
      contactId: contact.id,
      templateId: template.id,
      sequenceEnrollmentId: enrollment.id,
      sequenceId: enrollment.sequenceId,
      sequenceStepId: step.id,
      provider: 'ses',
      senderAccountId,
      resolvedSubject: sendSubject,
      resolvedPreviewText: resolved.previewText || null,
      resolvedBodyHtml: bodyHtml,
      resolvedBodyText,
      status: 'failed',
    });

    try {
      const result = await this.sendDispatcher.send({
        to: contact.email,
        subject: sendSubject,
        html: forceTextOnly ? '' : bodyHtml,
        text: resolvedBodyText,
        unsubscribeUrl,
        includeUnsubscribeHeader: seqSettings?.unsubHeader !== false,
        messageTags: {
          sequenceId: enrollment.sequenceId,
          sequenceStepId: step.id,
        },
        senderAccountId,
        fromName: sequence?.fromName ?? undefined,
        replyTo: sequence?.replyTo ?? undefined,
        threadId: useThread,
        inReplyToMessageId: lastMsgId ?? undefined,
        cc: seqSettings?.cc ?? undefined,
        bcc: seqSettings?.bcc ?? undefined,
      });
      await this.drizzle.db
        .update(sends)
        .set({
          status: 'sent',
          provider: result.provider,
          senderAccountId,
          providerMessageId: result.providerMessageId,
          providerThreadId: result.providerThreadId ?? useThread ?? null,
          cc: seqSettings?.cc ?? null,
          bcc: seqSettings?.bcc ?? null,
          sentAt: new Date(),
        })
        .where(eq(sends.id, sendId));
    } catch (err) {
      await this.drizzle.db
        .update(sends)
        .set({
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        })
        .where(eq(sends.id, sendId));
    }
  }

  /**
   * Sticky sender resolution. First send_email for an enrollment rotates
   * across the sequence's sender set (most headroom wins) and pins the
   * winner on the enrollment row; every later step reuses the pin. A pin
   * pointing at an inactive/exhausted account re-pins from the set. Legacy
   * single sender / global auto-pick apply when no set is configured.
   */
  private async resolveSenderAccount(
    enrollment: typeof sequenceEnrollments.$inferSelect,
    sequence: typeof sequences.$inferSelect | undefined,
    rootSequenceId: string,
  ): Promise<string | undefined> {
    if (enrollment.senderAccountId) {
      try {
        const pinned = await this.senderAccounts.pickAccountForSend(
          enrollment.senderAccountId,
        );
        return pinned.id;
      } catch {
        // pinned account unusable — fall through and re-pin below
      }
    }
    // Sender set is inherited from the root parent for subsequence children.
    const setRows = await this.drizzle.db.query.sequenceSenders.findMany({
      where: eq(sequenceSenders.sequenceId, rootSequenceId),
    });
    const picked =
      setRows.length > 0
        ? await this.senderAccounts.pickAccountFromSet(
            setRows.map((r) => r.senderAccountId),
          )
        : sequence?.senderAccountId
          ? await this.senderAccounts.pickAccountForSend(
              sequence.senderAccountId,
            )
          : await this.senderAccounts.pickAccountForSend();
    await this.drizzle.db
      .update(sequenceEnrollments)
      .set({ senderAccountId: picked.id, updatedAt: new Date() })
      .where(eq(sequenceEnrollments.id, enrollment.id));
    return picked.id;
  }

  private async recordFailedSend(
    enrollment: typeof sequenceEnrollments.$inferSelect,
    step: typeof sequenceSteps.$inferSelect,
    contactId: string,
    error: string,
  ) {
    await this.drizzle.db.insert(sends).values({
      contactId,
      sequenceEnrollmentId: enrollment.id,
      sequenceId: enrollment.sequenceId,
      sequenceStepId: step.id,
      provider: 'ses',
      resolvedSubject: '',
      resolvedBodyHtml: '',
      resolvedBodyText: '',
      status: 'failed',
      error,
    });
  }

  private async advance(
    sequenceId: string,
    contactId: string,
    enrollmentId: string,
    fromOrder: number,
    now: Date,
  ) {
    const allSteps: RunnerStep[] = await this.drizzle.db
      .select()
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId))
      .orderBy(asc(sequenceSteps.order));

    const resolution = resolveNextExecutableStep(allSteps, fromOrder, now);

    if (resolution.done) {
      await this.drizzle.db
        .update(sequenceEnrollments)
        .set({
          status: 'completed',
          currentStepId: null,
          nextRunAt: null,
          updatedAt: now,
        })
        .where(eq(sequenceEnrollments.id, enrollmentId));
      this.events.emit('sequence.completed', {
        enrollmentId,
        sequenceId,
        contactId,
      });
      return;
    }

    await this.drizzle.db
      .update(sequenceEnrollments)
      .set({
        currentStepId: resolution.stepId,
        nextRunAt: resolution.runAt,
        updatedAt: now,
      })
      .where(eq(sequenceEnrollments.id, enrollmentId));
  }

  private async sendStepIndex(
    sequenceId: string,
    stepId: string,
  ): Promise<number> {
    const steps = await this.drizzle.db
      .select()
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId))
      .orderBy(asc(sequenceSteps.order));
    return steps
      .filter((s) => s.type === 'send_email')
      .findIndex((s) => s.id === stepId);
  }

  /**
   * Effective sender + settings for a sequence. A subsequence child inherits
   * them live from its root parent; the child's own settings row contributes
   * only its sending schedule.
   */
  private async effectiveContext(sequenceId: string) {
    const sequence = await this.drizzle.db.query.sequences.findFirst({
      where: eq(sequences.id, sequenceId),
    });
    const rootSequenceId = sequence?.parentSequenceId ?? sequenceId;
    const rootSequence =
      rootSequenceId === sequenceId
        ? sequence
        : await this.drizzle.db.query.sequences.findFirst({
            where: eq(sequences.id, rootSequenceId),
          });
    const rootSettings =
      await this.drizzle.db.query.sequenceSettings.findFirst({
        where: eq(sequenceSettings.sequenceId, rootSequenceId),
      });
    const ownSettings =
      rootSequenceId === sequenceId
        ? rootSettings
        : await this.drizzle.db.query.sequenceSettings.findFirst({
            where: eq(sequenceSettings.sequenceId, sequenceId),
          });
    const settings = rootSettings
      ? {
          ...rootSettings,
          scheduleId: ownSettings?.scheduleId ?? rootSettings.scheduleId,
        }
      : rootSettings;
    return { sequence: rootSequence, rootSequenceId, settings };
  }

  /** T07 — true when now falls inside the sequence's sending schedule. */
  private async withinSchedule(
    sequenceId: string,
    now: Date,
  ): Promise<boolean> {
    const { settings: st } = await this.effectiveContext(sequenceId);
    if (!st?.scheduleId) return true;
    const sched = await this.drizzle.db.query.sendingSchedules.findFirst({
      where: eq(sendingSchedules.id, st.scheduleId),
    });
    if (!sched) return true;
    try {
      const tz = sched.timezone || 'UTC';
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = fmt.formatToParts(now);
      const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
      // Intl Sunday-first → our Mon-first array.
      const map: Record<string, number> = {
        Mon: 0,
        Tue: 1,
        Wed: 2,
        Thu: 3,
        Fri: 4,
        Sat: 5,
        Sun: 6,
      };
      const dayIdx = map[weekday] ?? 0;
      if (!sched.days?.[dayIdx]) return false;
      const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
      const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
      const cur = hour * 60 + minute;
      return cur >= sched.startMin && cur < sched.endMin;
    } catch {
      return true;
    }
  }
}
