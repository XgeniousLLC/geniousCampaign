import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { resolveTemplateContent } from '@genius-campaign/shared';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { campaigns, sends, templates, lists, contacts, contactTags, emailEvents, senderAccounts } from '../db/schema';
import { ListsService } from '../lists/lists.service';
import { SettingsService } from '../settings/settings.service';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { SenderAccountService } from '../sending/sender-account.service';
import { rewriteLinksForTracking } from '../tracking/rewrite-links.util';
import { signUnsubscribeToken } from '../sending/unsubscribe-token.util';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

const DEFAULT_LARGE_SEND_THRESHOLD = 5000;

/** One provider call must never hang a recipient job forever — a stuck
 *  send used to wedge the whole campaign in 'sending' with no recovery. */
const RECIPIENT_SEND_TIMEOUT_MS = 30_000;

/** Payload of a per-recipient campaign send job. `total` is the recipient
 *  count snapshotted at fan-out time — each job flips the campaign to its
 *  terminal status once the counters reach it. */
export interface CampaignRecipientJobData {
  campaignId: string;
  contactId: string;
  total: number;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly lists: ListsService,
    private readonly events: EventEmitter2,
    private readonly settings: SettingsService,
    private readonly suppression: SuppressionService,
    private readonly tracking: TrackingService,
    private readonly sendDispatcher: SendDispatcherService,
    private readonly senderAccounts: SenderAccountService,
    @InjectQueue('campaign-send') private readonly queue: Queue,
  ) {}

  largeSendThreshold(): number {
    return Number(this.config.get<string>('LARGE_SEND_THRESHOLD') ?? DEFAULT_LARGE_SEND_THRESHOLD);
  }

  /** GC-070 — a campaign targets a list (or several, unioned), a set of tags
   * (any-match), or a hand-picked set of contacts. Exactly one of
   * listIds/tagIds/contactIds is populated, matching audienceType —
   * validated here rather than as a DB constraint, so the error is a clear
   * 400 at create time. excludeListIds (GC-112) is independent of
   * audienceType — it's a subtraction applied in resolveRecipients()
   * regardless of how the base recipient set was built. */
  async create(dto: CreateCampaignDto, db: DbOrTx = this.drizzle.db) {
    const template = await db.query.templates.findFirst({ where: eq(templates.id, dto.templateId) });
    if (!template) throw new NotFoundException(`Template ${dto.templateId} not found`);

    const audienceType = dto.audienceType ?? 'list';
    if (audienceType === 'list') {
      if (!dto.listIds?.length) throw new BadRequestException('listIds is required when audienceType is "list"');
      const found = await db.query.lists.findMany({ where: inArray(lists.id, dto.listIds) });
      if (found.length !== dto.listIds.length) throw new NotFoundException('One or more selected lists were not found');
    } else if (audienceType === 'tags') {
      if (!dto.tagIds?.length) throw new BadRequestException('tagIds is required when audienceType is "tags"');
    } else if (audienceType === 'contacts') {
      if (!dto.contactIds?.length) throw new BadRequestException('contactIds is required when audienceType is "contacts"');
    }
    if (dto.excludeListIds?.length) {
      const found = await db.query.lists.findMany({ where: inArray(lists.id, dto.excludeListIds) });
      if (found.length !== dto.excludeListIds.length) throw new NotFoundException('One or more excluded lists were not found');
    }
    if (dto.senderAccountId) await this.assertSenderAccountExists(dto.senderAccountId, db);

    const [created] = await db
      .insert(campaigns)
      .values({
        name: dto.name,
        templateId: dto.templateId,
        audienceType,
        listIds: audienceType === 'list' ? dto.listIds : undefined,
        tagIds: audienceType === 'tags' ? dto.tagIds : undefined,
        contactIds: audienceType === 'contacts' ? dto.contactIds : undefined,
        excludeListIds: dto.excludeListIds?.length ? dto.excludeListIds : undefined,
        isDryRun: dto.isDryRun ?? false,
        sendToEmail: dto.sendToEmail,
        senderAccountId: dto.senderAccountId,
        fromName: dto.fromName,
        replyTo: dto.replyTo,
      })
      .returning();
    return created;
  }

  private async assertSenderAccountExists(id: string, db: DbOrTx) {
    const account = await db.query.senderAccounts.findFirst({ where: eq(senderAccounts.id, id) });
    if (!account) throw new NotFoundException(`Sender account ${id} not found`);
  }

  /** GC-125 — lets a still-unsent draft be corrected (audience, template,
   * sender/from-name/reply-to, etc.) without deleting and recreating it.
   * Only ever valid while status is still 'draft' — once send() has fired
   * (status flips to 'sending'/'sent'/'failed') the campaign is a record of
   * what actually went out, not something to keep editing. */
  async update(id: string, dto: UpdateCampaignDto, db: DbOrTx = this.drizzle.db) {
    const campaign = await this.findOne(id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException(`Campaign ${id} is already ${campaign.status} — cannot edit`);
    }

    if (dto.templateId) {
      const template = await db.query.templates.findFirst({ where: eq(templates.id, dto.templateId) });
      if (!template) throw new NotFoundException(`Template ${dto.templateId} not found`);
    }

    const audienceType = dto.audienceType ?? campaign.audienceType;
    if (dto.audienceType) {
      if (audienceType === 'list') {
        if (!dto.listIds?.length) throw new BadRequestException('listIds is required when audienceType is "list"');
        const found = await db.query.lists.findMany({ where: inArray(lists.id, dto.listIds) });
        if (found.length !== dto.listIds.length) throw new NotFoundException('One or more selected lists were not found');
      } else if (audienceType === 'tags') {
        if (!dto.tagIds?.length) throw new BadRequestException('tagIds is required when audienceType is "tags"');
      } else if (audienceType === 'contacts') {
        if (!dto.contactIds?.length) throw new BadRequestException('contactIds is required when audienceType is "contacts"');
      }
    }
    if (dto.excludeListIds?.length) {
      const found = await db.query.lists.findMany({ where: inArray(lists.id, dto.excludeListIds) });
      if (found.length !== dto.excludeListIds.length) throw new NotFoundException('One or more excluded lists were not found');
    }
    if (dto.senderAccountId) await this.assertSenderAccountExists(dto.senderAccountId, db);

    const [updated] = await db
      .update(campaigns)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.templateId !== undefined ? { templateId: dto.templateId } : {}),
        ...(dto.audienceType !== undefined
          ? {
              audienceType,
              listIds: audienceType === 'list' ? dto.listIds : null,
              tagIds: audienceType === 'tags' ? dto.tagIds : null,
              contactIds: audienceType === 'contacts' ? dto.contactIds : null,
            }
          : {}),
        ...(dto.excludeListIds !== undefined ? { excludeListIds: dto.excludeListIds.length ? dto.excludeListIds : null } : {}),
        ...(dto.isDryRun !== undefined ? { isDryRun: dto.isDryRun } : {}),
        ...(dto.sendToEmail !== undefined ? { sendToEmail: dto.sendToEmail } : {}),
        ...(dto.senderAccountId !== undefined ? { senderAccountId: dto.senderAccountId || null } : {}),
        ...(dto.fromName !== undefined ? { fromName: dto.fromName || null } : {}),
        ...(dto.replyTo !== undefined ? { replyTo: dto.replyTo || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  /** Resolves the real recipient set for any audience type — the one place
   * both the pre-send recipient-count check and the actual send loop
   * (`CampaignSendProcessor`) get their contacts from, so "how many
   * recipients" (GC-050/053) never disagrees with "who actually gets sent
   * to." Tag audience is any-match (a contact with ANY selected tag
   * qualifies), matching the design's own copy. List audience unions
   * multiple lists (GC-112) — a contact in more than one selected list is
   * still counted once. excludeListIds (GC-112) is then subtracted from
   * whatever the base set was, regardless of audienceType. */
  async resolveRecipients(campaign: typeof campaigns.$inferSelect): Promise<{ contact: typeof contacts.$inferSelect }[]> {
    let recipients: { contact: typeof contacts.$inferSelect }[];

    if (campaign.audienceType === 'tags') {
      const tagIds = campaign.tagIds ?? [];
      recipients = tagIds.length
        ? await this.drizzle.db
            .selectDistinct({ contact: contacts })
            .from(contactTags)
            .innerJoin(contacts, eq(contactTags.contactId, contacts.id))
            .where(inArray(contactTags.tagId, tagIds))
        : [];
    } else if (campaign.audienceType === 'contacts') {
      const contactIds = campaign.contactIds ?? [];
      const rows = contactIds.length ? await this.drizzle.db.select().from(contacts).where(inArray(contacts.id, contactIds)) : [];
      recipients = rows.map((contact) => ({ contact }));
    } else {
      const listIds = campaign.listIds ?? [];
      const byContactId = new Map<string, { contact: typeof contacts.$inferSelect }>();
      for (const rows of await Promise.all(listIds.map((id) => this.lists.listContacts(id)))) {
        for (const row of rows) byContactId.set(row.contact.id, row);
      }
      recipients = [...byContactId.values()];
    }

    const excludeListIds = campaign.excludeListIds ?? [];
    if (excludeListIds.length === 0) return recipients;
    const excludedIds = new Set<string>();
    for (const rows of await Promise.all(excludeListIds.map((id) => this.lists.listContacts(id)))) {
      for (const row of rows) excludedIds.add(row.contact.id);
    }
    return recipients.filter((r) => !excludedIds.has(r.contact.id));
  }

  /** Campaigns list screen (design: Sent/Open/Click columns) needs real
   * per-campaign engagement, not just the send-outcome counters already
   * stored on the row — computed the same way as templates' uses/open-rate
   * (GC-062 area), not stored, so it can't drift from the real event data. */
  async findAll() {
    const campaignRows = await this.drizzle.db.query.campaigns.findMany({ orderBy: (c, { desc }) => desc(c.createdAt) });

    const eventRows = await this.drizzle.db
      .select({
        campaignId: sends.campaignId,
        opens: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'open')`.mapWith(Number),
        clicks: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'click')`.mapWith(Number),
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .groupBy(sends.campaignId);
    const byCampaign = new Map(eventRows.map((r) => [r.campaignId, r]));

    return campaignRows.map((c) => ({
      ...c,
      openCount: byCampaign.get(c.id)?.opens ?? 0,
      clickCount: byCampaign.get(c.id)?.clicks ?? 0,
    }));
  }

  async findOne(id: string) {
    const campaign = await this.drizzle.db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  /** Per-send opened/clicked flags for the campaign detail screen's
   * recipient list + engagement funnel/ratio stats — same event-derived
   * shape as the campaigns-list aggregation above, just per-send instead
   * of summed. */
  async getSends(campaignId: string) {
    await this.findOne(campaignId);
    const sendRows = await this.drizzle.db.query.sends.findMany({
      where: eq(sends.campaignId, campaignId),
      orderBy: (s, { desc }) => desc(s.createdAt),
    });

    const sendIds = sendRows.map((s) => s.id);
    const eventRows = sendIds.length
      ? await this.drizzle.db.select().from(emailEvents).where(inArray(emailEvents.sendId, sendIds))
      : [];
    const openedIds = new Set(eventRows.filter((e) => e.type === 'open').map((e) => e.sendId));
    const clickedIds = new Set(eventRows.filter((e) => e.type === 'click').map((e) => e.sendId));

    return sendRows.map((s) => ({ ...s, opened: openedIds.has(s.id), clicked: clickedIds.has(s.id) }));
  }

  /** Enqueues one short-lived BullMQ fan-out job to actually send —
   * invariant 10, never sends synchronously in the request/response cycle.
   * jobId = campaignId so a duplicate "send" click while a job is already
   * queued/running is a no-op rather than a second full send.
   *
   * The fan-out job itself sends nothing — it snapshots the recipient set
   * and enqueues one short child job per recipient (`fanOutCampaign()`).
   * A crash/restart therefore only ever loses unfinished child jobs, which
   * resume idempotently, instead of wedging the whole campaign in
   * 'sending' the way the old single-loop job did.
   *
   * GC-053: a send above largeSendThreshold() is blocked server-side
   * (not just hidden client-side) unless `confirmed: true` is explicitly
   * passed — the UI shows the same threshold so a real admin sees the
   * confirmation step, but the block itself doesn't trust the client.
   *
   * GC-113: an optional future `scheduledAt` delays the same job via
   * BullMQ's `delay` option instead of firing it immediately — status stays
   * 'draft' the whole time (invariant 3: `CampaignSendProcessor` re-checks
   * status==='draft' right before it actually sends, so nothing new is
   * needed there). `scheduledAt` on the row is purely what the UI reads to
   * show "scheduled for <time>" vs a plain untouched draft. */
  async send(id: string, confirmed = false, scheduledAt?: string) {
    const campaign = await this.findOne(id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException(`Campaign ${id} is already ${campaign.status} — cannot send again`);
    }

    let scheduledDate: Date | undefined;
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        throw new BadRequestException('scheduledAt must be a valid future date');
      }
    }

    const recipients = await this.resolveRecipients(campaign);
    const threshold = this.largeSendThreshold();
    if (recipients.length > threshold && !confirmed) {
      return {
        id,
        status: 'confirmation_required' as const,
        recipientCount: recipients.length,
        threshold,
      };
    }

    if (recipients.length > threshold) {
      await this.drizzle.db.update(campaigns).set({ largeSendConfirmed: true, updatedAt: new Date() }).where(eq(campaigns.id, id));
      this.events.emit('campaign.large_send_confirmed', {
        campaignId: id,
        name: campaign.name,
        recipientCount: recipients.length,
        threshold,
      });
    }

    await this.drizzle.db
      .update(campaigns)
      .set({ scheduledAt: scheduledDate ?? null, updatedAt: new Date() })
      .where(eq(campaigns.id, id));

    const delay = scheduledDate ? scheduledDate.getTime() - Date.now() : 0;
    await this.queue.add(
      'fan-out',
      { campaignId: id },
      { jobId: id, delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true, removeOnFail: 100 },
    );
    return scheduledDate
      ? { id, status: 'scheduled' as const, scheduledAt: scheduledDate.toISOString() }
      : { id, status: 'queued' as const };
  }

  /** Fan-out half of a campaign send — runs as the `fan-out` BullMQ job.
   * Re-checks status==='draft' at fire time (invariant 3 pattern), so a
   * duplicate/delayed job for an already-sending/sent campaign is a no-op,
   * then snapshots the recipient set and enqueues one short child job per
   * recipient (`jobId = campaignId--contactId`, so re-fan-out after a crash
   * dedups against still-queued children instead of double-sending). */
  async fanOutCampaign(campaignId: string) {
    const campaign = await this.drizzle.db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });
    if (!campaign || campaign.status !== 'draft') {
      return { skipped: true };
    }

    const template = await this.drizzle.db.query.templates.findFirst({
      where: eq(templates.id, campaign.templateId),
    });
    if (!template) {
      await this.drizzle.db
        .update(campaigns)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(campaigns.id, campaign.id));
      return { error: `Template ${campaign.templateId} not found` };
    }

    // GC-125 — an explicit sender pick is validated once, up front: if it's
    // inactive/exhausted the whole send hard-fails with one clear error
    // rather than every recipient failing individually with the same cause.
    if (!campaign.isDryRun && campaign.senderAccountId) {
      try {
        await this.senderAccounts.pickAccountForSend(campaign.senderAccountId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.drizzle.db
          .update(campaigns)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(campaigns.id, campaign.id));
        this.logger.error(`Campaign "${campaign.name}" (${campaign.id}) failed: ${message}`);
        return { error: message };
      }
    }

    const recipients = await this.resolveRecipients(campaign);
    await this.drizzle.db
      .update(campaigns)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(eq(campaigns.id, campaign.id));

    if (recipients.length === 0) {
      await this.finishCampaign(campaign.id, campaign.name, 0, 0, 0);
      return { sentCount: 0, failedCount: 0, suppressedCount: 0 };
    }

    const total = recipients.length;
    // NOTE: BullMQ custom jobIds must not contain ':' — the double-dash
    // separator is just an opaque unique key, never parsed.
    await this.queue.addBulk(
      recipients.map(({ contact }) => ({
        name: 'recipient',
        data: { campaignId: campaign.id, contactId: contact.id, total } satisfies CampaignRecipientJobData,
        opts: {
          jobId: `${campaign.id}--${contact.id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      })),
    );
    return { enqueued: total };
  }

  /** Recipient half of a campaign send — runs as one short `recipient`
   * BullMQ job per contact. Idempotent: a `sends` row for this
   * (campaignId, contactId) pair means this recipient is already done
   * (written by an earlier attempt before a crash/retry), so it is skipped
   * rather than emailed twice. The per-recipient body (suppression gates,
   * personalization-before-spintax, tracking URLs, dry-run vs real send)
   * is the same logic the old single-loop processor ran inline. */
  async sendRecipient(data: CampaignRecipientJobData) {
    const { campaignId, contactId, total } = data;
    const campaign = await this.drizzle.db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });
    if (!campaign || campaign.status !== 'sending') {
      return { skipped: true };
    }
    const template = await this.drizzle.db.query.templates.findFirst({
      where: eq(templates.id, campaign.templateId),
    });
    if (!template) {
      return { skipped: true };
    }
    const contact = await this.drizzle.db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
    });
    if (!contact) {
      return { skipped: true };
    }

    const already = await this.drizzle.db.query.sends.findFirst({
      where: and(eq(sends.campaignId, campaignId), eq(sends.contactId, contactId)),
    });
    if (already) {
      // A crash between the `sends` write and its counter bump below leaves
      // the counters short — re-derive them from the rows (atomic, converges
      // under concurrency) so completion can't wedge on a lost increment.
      await this.syncCounters(campaignId);
      await this.maybeFinishCampaign(campaignId, total);
      return { skipped: true };
    }

    // Two independent gates: suppression_list (bounces/complaints/manual
    // unsubscribe/invalid-verification) and contact.status — a contact
    // can carry status 'suppressed'/'unsubscribed' without a matching
    // suppression_list row (e.g. set directly via CSV import or a
    // PATCH /contacts/:id) and must still never receive a send.
    const statusBlocked = contact.status === 'suppressed' || contact.status === 'unsubscribed';
    if (statusBlocked || (await this.suppression.isSuppressed(contact.email))) {
      await this.drizzle.db.insert(sends).values({
        contactId: contact.id,
        templateId: template.id,
        campaignId: campaign.id,
        provider: 'ses',
        resolvedSubject: template.subjectLines[0] ?? '',
        resolvedPreviewText: template.previewTextLines[0] ?? null,
        resolvedBodyHtml: template.bodyHtml,
        resolvedBodyText: template.bodyText,
        status: 'suppressed',
        error: statusBlocked
          ? `${contact.email} has status "${contact.status}"`
          : `${contact.email} is on the suppression list`,
        isDryRun: campaign.isDryRun,
      });
      await this.bumpCounter(campaign.id, 'suppressedCount');
      await this.maybeFinishCampaign(campaign.id, total);
      return { suppressed: true };
    }

    // Personalization resolved before spintax — invariant 5.
    // resolveTemplateContent() also picks a random subject/preview-text
    // line per recipient (shuffle), as the outer step before that.
    const resolved = resolveTemplateContent(template, contact);
    const resolvedSubject = resolved.subject;
    const resolvedBodyHtmlRaw = resolved.bodyHtml;
    const resolvedBodyText = resolved.bodyText;

    const sendId = randomUUID();
    const openPixelUrl = this.tracking.buildOpenPixelUrl(sendId);
    const htmlWithClickTracking = rewriteLinksForTracking(
      resolvedBodyHtmlRaw,
      (url) => this.tracking.buildClickUrl(sendId, url),
    );
    const resolvedBodyHtml = `${htmlWithClickTracking}<img src="${openPixelUrl}" width="1" height="1" alt="" style="display:none" />`;

    const trackingSecret = this.settings.get('TRACKING_SIGNING_SECRET');
    const unsubscribeUrl = trackingSecret
      ? `${this.tracking.baseUrl}/unsubscribe/${signUnsubscribeToken(trackingSecret, contact.email)}`
      : '#';

    if (campaign.isDryRun) {
      // Dry-run stops here — never calls the real sender at all. Distinct
      // from sendToEmail below (GC-052's other half): dry-run means "never
      // send", sendToEmail means "really send, just redirected".
      await this.drizzle.db.insert(sends).values({
        id: sendId,
        contactId: contact.id,
        templateId: template.id,
        campaignId: campaign.id,
        provider: 'ses',
        resolvedSubject,
        resolvedPreviewText: resolved.previewText || null,
        resolvedBodyHtml,
        resolvedBodyText,
        status: 'sent',
        isDryRun: true,
        sentAt: new Date(),
      });
      await this.bumpCounter(campaign.id, 'sentCount');
      await this.maybeFinishCampaign(campaign.id, total);
      return { sent: true, dryRun: true };
    }

    await this.drizzle.db.insert(sends).values({
      id: sendId,
      contactId: contact.id,
      templateId: template.id,
      campaignId: campaign.id,
      provider: 'ses',
      resolvedSubject,
      resolvedPreviewText: resolved.previewText || null,
      resolvedBodyHtml,
      resolvedBodyText,
      status: 'failed',
    });

    try {
      // GC-052 send-to-self: a real send, quota still consumed, just
      // redirected to a fixed test address rather than the real
      // recipient — the subject marks who it was really meant for.
      const sendTarget = campaign.sendToEmail || contact.email;
      const sendSubject = campaign.sendToEmail ? `[Test → ${contact.email}] ${resolvedSubject}` : resolvedSubject;
      const result = await this.withTimeout(
        this.sendDispatcher.send({
          to: sendTarget,
          subject: sendSubject,
          html: resolvedBodyHtml,
          text: resolvedBodyText,
          unsubscribeUrl,
          messageTags: { campaignId: campaign.id },
          senderAccountId: campaign.senderAccountId ?? undefined,
          fromName: campaign.fromName ?? undefined,
          replyTo: campaign.replyTo ?? undefined,
        }),
        RECIPIENT_SEND_TIMEOUT_MS,
      );
      await this.drizzle.db
        .update(sends)
        .set({
          status: 'sent',
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
        })
        .where(eq(sends.id, sendId));
      await this.bumpCounter(campaign.id, 'sentCount');
      await this.maybeFinishCampaign(campaign.id, total);
      return { sent: true, provider: result.provider };
    } catch (err) {
      await this.drizzle.db
        .update(sends)
        .set({ status: 'failed', error: err instanceof Error ? err.message : String(err) })
        .where(eq(sends.id, sendId));
      await this.bumpCounter(campaign.id, 'failedCount');
      // A failed recipient attempt still counts toward completion (attempts:
      // 3 with backoff already gave the provider three chances) — without
      // this, one dead provider would wedge the campaign in 'sending'.
      await this.maybeFinishCampaign(campaign.id, total);
      return { failed: true };
    }
  }

  /** Resumes a single campaign that is stuck mid-send (crashed worker,
   * killed container, lost Redis job): re-enqueues a `recipient` job for
   * every resolved recipient with no `sends` row yet. Already-sent
   * recipients are skipped by idempotency, never re-emailed. Also
   * re-enqueues a lost delayed fan-out for a still-`draft` scheduled
   * campaign whose job vanished (e.g. Redis flush). */
  async resumeCampaign(id: string) {
    const campaign = await this.findOne(id);

    if (campaign.status === 'draft' && campaign.scheduledAt) {
      const job = await this.queue.getJob(id);
      if (job) {
        const state = await job.getState();
        if (state === 'delayed' || state === 'waiting' || state === 'active') {
          return { id, resumed: false as const, reason: 'schedule still queued' };
        }
      }
      const delay = Math.max(campaign.scheduledAt.getTime() - Date.now(), 0);
      await this.queue.add(
        'fan-out',
        { campaignId: id },
        { jobId: id, delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true, removeOnFail: 100 },
      );
      return { id, resumed: true as const, reason: 're-enqueued lost schedule' };
    }

    if (campaign.status !== 'sending') {
      return { id, resumed: false as const, reason: `status is ${campaign.status}` };
    }

    const recipients = await this.resolveRecipients(campaign);
    const existingRows = await this.drizzle.db
      .select({ contactId: sends.contactId })
      .from(sends)
      .where(eq(sends.campaignId, id));
    const doneIds = new Set(existingRows.map((r) => r.contactId));
    const missing = recipients.filter((r) => !doneIds.has(r.contact.id));
    const total = Math.max(recipients.length, existingRows.length);

    if (missing.length === 0) {
      await this.reconcileAndFinish(id, total);
      return { id, resumed: true as const, reason: 'no recipients left, finalized' };
    }

    // The counters may be short (a crash between a `sends` write and its
    // bump) — re-derive them now so the requeued jobs' completion check
    // counts the already-written rows.
    await this.syncCounters(id);

    await this.queue.addBulk(
      missing.map(({ contact }) => ({
        name: 'recipient',
        data: { campaignId: id, contactId: contact.id, total } satisfies CampaignRecipientJobData,
        opts: {
          jobId: `${id}--${contact.id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      })),
    );
    return { id, resumed: true as const, requeued: missing.length };
  }

  /** Boot sweep: picks up whatever a crash/restart left behind — campaigns
   * wedged in 'sending', and scheduled drafts whose delayed job is gone.
   * Safe to run on every boot: everything re-enqueued is idempotent. */
  async resumeStuckCampaigns() {
    const stuck = await this.drizzle.db
      .select({ id: campaigns.id, status: campaigns.status })
      .from(campaigns)
      .where(inArray(campaigns.status, ['sending', 'draft']));
    let resumed = 0;
    for (const row of stuck) {
      try {
        const campaign = await this.drizzle.db.query.campaigns.findFirst({
          where: eq(campaigns.id, row.id),
        });
        if (!campaign) continue;
        if (campaign.status === 'sending' || (campaign.status === 'draft' && campaign.scheduledAt)) {
          const result = await this.resumeCampaign(row.id);
          if (result.resumed) {
            resumed++;
            this.logger.log(`Resumed campaign ${row.id}: ${result.reason ?? `${(result as { requeued?: number }).requeued ?? 0} recipient(s) requeued`}`);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to resume campaign ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { checked: stuck.length, resumed };
  }

  private async bumpCounter(campaignId: string, column: 'sentCount' | 'failedCount' | 'suppressedCount') {
    await this.drizzle.db
      .update(campaigns)
      .set({ [column]: sql`${campaigns[column]} + 1`, updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
  }

  /** Flips a 'sending' campaign to its terminal status once every recipient
   * has a `sends` row. Guarded on status==='sending' so concurrent
   * finishers can't flip it twice (or flip a manually-recovered row). */
  private async maybeFinishCampaign(campaignId: string, total: number) {
    const campaign = await this.drizzle.db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });
    if (!campaign || campaign.status !== 'sending') return;
    const done = campaign.sentCount + campaign.failedCount + campaign.suppressedCount;
    if (done < total) return;
    await this.finishCampaign(campaignId, campaign.name, campaign.sentCount, campaign.failedCount, campaign.suppressedCount);
  }

  private async finishCampaign(campaignId: string, name: string, sentCount: number, failedCount: number, suppressedCount: number) {
    const attempted = sentCount + failedCount;
    const finalStatus = attempted > 0 && sentCount === 0 ? 'failed' : 'sent';
    const updated = await this.drizzle.db
      .update(campaigns)
      .set({ status: finalStatus, sentCount, failedCount, suppressedCount, updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.status, 'sending')))
      .returning();
    if (updated.length === 0) return;
    this.logger.log(`Campaign "${name}" (${campaignId}) finished: ${sentCount} sent, ${failedCount} failed, ${suppressedCount} suppressed`);
    this.events.emit('campaign.completed', { campaignId, name, sentCount, failedCount, suppressedCount });
  }

  /** Re-derives counters from the actual `sends` rows (the counters may be
   * short after a crash that killed the process between a send write and
   * its counter bump) and finalizes. */
  private async reconcileAndFinish(campaignId: string, total: number) {
    await this.syncCounters(campaignId);
    void total;
    const campaign = await this.drizzle.db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
    if (!campaign || campaign.status !== 'sending') return;
    await this.finishCampaign(campaignId, campaign.name, campaign.sentCount, campaign.failedCount, campaign.suppressedCount);
  }

  /** Single-statement counter re-derivation — atomic, so concurrent
   * idempotent retries converge instead of double-counting. */
  private async syncCounters(campaignId: string) {
    await this.drizzle.db.execute(sql`
      UPDATE campaigns SET
        sent_count = (SELECT count(*)::int FROM sends WHERE campaign_id = ${campaignId} AND status IN ('sent', 'delivered')),
        failed_count = (SELECT count(*)::int FROM sends WHERE campaign_id = ${campaignId} AND status IN ('failed', 'bounced', 'complained')),
        suppressed_count = (SELECT count(*)::int FROM sends WHERE campaign_id = ${campaignId} AND status = 'suppressed'),
        updated_at = now()
      WHERE id = ${campaignId}`);
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Send timed out after ${ms}ms`)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  /** Deletes a campaign. Blocked while 'sending': recipient jobs hold this
   * row's id for the duration of the send and insert `sends` rows
   * referencing it (`campaignId` FK) as they go — deleting mid-send would
   * make those inserts violate the FK constraint and corrupt the running
   * jobs. Draft/sent/failed are all safe to delete; `sends.campaignId` is
   * `onDelete: 'set null'` so past send records survive as orphaned history
   * rather than being deleted with the campaign. */
  async remove(id: string, db: DbOrTx = this.drizzle.db) {
    const campaign = await this.findOne(id);
    if (campaign.status === 'sending') {
      throw new BadRequestException(`Campaign ${id} is currently sending — cannot delete`);
    }
    await db.delete(campaigns).where(eq(campaigns.id, id));
    return { id };
  }

  /** A dry-run campaign's row is the historical record of what that dry run
   * actually did — `update()`/`send()` both require status === 'draft', so
   * a completed dry run (status 'sent'/'failed') can never be turned into a
   * real send in place. Instead this clones the same
   * template/audience/sender config into a brand-new 'draft' campaign with
   * isDryRun: false, so the normal review → send flow (large-send
   * confirmation, edit, "Send now") applies unchanged rather than adding a
   * second send path. */
  async runForReal(id: string, db: DbOrTx = this.drizzle.db) {
    const campaign = await this.findOne(id);
    if (!campaign.isDryRun) {
      throw new BadRequestException(`Campaign ${id} is not a dry run`);
    }

    const [created] = await db
      .insert(campaigns)
      .values({
        name: `${campaign.name} (real send)`,
        templateId: campaign.templateId,
        audienceType: campaign.audienceType,
        listIds: campaign.listIds,
        tagIds: campaign.tagIds,
        contactIds: campaign.contactIds,
        excludeListIds: campaign.excludeListIds,
        isDryRun: false,
        sendToEmail: campaign.sendToEmail,
        senderAccountId: campaign.senderAccountId,
        fromName: campaign.fromName,
        replyTo: campaign.replyTo,
      })
      .returning();
    return created;
  }

  /** Cancels a pending schedule (GC-113) — removes the not-yet-fired delayed
   * BullMQ job (jobId === campaignId, same id `send()` used) and clears
   * scheduledAt so the campaign reverts to a plain unsent draft. Only valid
   * while still 'draft' and actually scheduled — once the processor has
   * picked it up (status flips to 'sending') there's nothing left to cancel. */
  async cancelSchedule(id: string) {
    const campaign = await this.findOne(id);
    if (campaign.status !== 'draft' || !campaign.scheduledAt) {
      throw new BadRequestException(`Campaign ${id} has no pending schedule to cancel`);
    }

    const job = await this.queue.getJob(id);
    if (job) {
      const state = await job.getState();
      if (state === 'delayed' || state === 'waiting') await job.remove();
    }

    await this.drizzle.db.update(campaigns).set({ scheduledAt: null, updatedAt: new Date() }).where(eq(campaigns.id, id));
    return { id, status: 'draft' as const };
  }
}
