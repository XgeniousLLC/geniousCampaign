import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { campaigns, sends, templates, lists, contacts, contactTags, emailEvents } from '../db/schema';
import { ListsService } from '../lists/lists.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

const DEFAULT_LARGE_SEND_THRESHOLD = 5000;

@Injectable()
export class CampaignsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly lists: ListsService,
    private readonly events: EventEmitter2,
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
      })
      .returning();
    return created;
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

  /** Enqueues one BullMQ job to actually send — invariant 10, never sends
   * synchronously in the request/response cycle. jobId = campaignId so a
   * duplicate "send" click while a job is already queued/running is a no-op
   * rather than a second full send.
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
    await this.queue.add('send', { campaignId: id }, { jobId: id, delay, removeOnComplete: true, removeOnFail: 100 });
    return scheduledDate
      ? { id, status: 'scheduled' as const, scheduledAt: scheduledDate.toISOString() }
      : { id, status: 'queued' as const };
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
