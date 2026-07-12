import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { campaigns, sends, templates, lists } from '../db/schema';
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

  async create(dto: CreateCampaignDto) {
    const template = await this.drizzle.db.query.templates.findFirst({ where: eq(templates.id, dto.templateId) });
    if (!template) throw new NotFoundException(`Template ${dto.templateId} not found`);
    const list = await this.drizzle.db.query.lists.findFirst({ where: eq(lists.id, dto.listId) });
    if (!list) throw new NotFoundException(`List ${dto.listId} not found`);

    const [created] = await this.drizzle.db
      .insert(campaigns)
      .values({
        name: dto.name,
        templateId: dto.templateId,
        listId: dto.listId,
        isDryRun: dto.isDryRun ?? false,
        sendToEmail: dto.sendToEmail,
      })
      .returning();
    return created;
  }

  findAll() {
    return this.drizzle.db.query.campaigns.findMany({ orderBy: (c, { desc }) => desc(c.createdAt) });
  }

  async findOne(id: string) {
    const campaign = await this.drizzle.db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async getSends(campaignId: string) {
    await this.findOne(campaignId);
    return this.drizzle.db.query.sends.findMany({
      where: eq(sends.campaignId, campaignId),
      orderBy: (s, { desc }) => desc(s.createdAt),
    });
  }

  /** Enqueues one BullMQ job to actually send — invariant 10, never sends
   * synchronously in the request/response cycle. jobId = campaignId so a
   * duplicate "send" click while a job is already queued/running is a no-op
   * rather than a second full send.
   *
   * GC-053: a send above largeSendThreshold() is blocked server-side
   * (not just hidden client-side) unless `confirmed: true` is explicitly
   * passed — the UI shows the same threshold so a real admin sees the
   * confirmation step, but the block itself doesn't trust the client. */
  async send(id: string, confirmed = false) {
    const campaign = await this.findOne(id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException(`Campaign ${id} is already ${campaign.status} — cannot send again`);
    }

    const recipients = await this.lists.listContacts(campaign.listId);
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

    await this.queue.add('send', { campaignId: id }, { jobId: id, removeOnComplete: true, removeOnFail: 100 });
    return { id, status: 'queued' as const };
  }
}
