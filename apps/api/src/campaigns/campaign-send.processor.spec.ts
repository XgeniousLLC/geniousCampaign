import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { Queue, type Job } from 'bullmq';
import { CampaignSendProcessor } from './campaign-send.processor';
import { CampaignsService } from './campaigns.service';
import { ListsService } from '../lists/lists.service';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { DebugLogService } from '../debug-log/debug-log.service';
import { SesSenderProvider } from '../sending/ses-sender.provider';
import { GmailSenderProvider } from '../sending/gmail-sender.provider';
import { SenderAccountService } from '../sending/sender-account.service';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import {
  contacts,
  templates,
  lists,
  campaigns,
  contactLists,
  sends,
  suppressionList,
} from '../db/schema';

function job<T>(name: string, data: T): Job<T> {
  return { name, data } as Job<T>;
}

describe('CampaignSendProcessor fan-out (integration, real DB)', () => {
  let processor: CampaignSendProcessor;
  let service: CampaignsService;
  let drizzle: DrizzleService;
  let queue: Queue;
  let moduleRef: TestingModule;
  let templateId: string;
  let listId: string;
  let normalContactId: string;
  let suppressedContactId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['../../.env', '.env'],
        }),
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: { url: config.get<string>('REDIS_URL') },
          }),
        }),
        BullModule.registerQueue({ name: 'campaign-send' }),
        EventEmitterModule.forRoot(),
      ],
      providers: [
        CampaignSendProcessor,
        CampaignsService,
        ListsService,
        SuppressionService,
        TrackingService,
        DebugLogService,
        SesSenderProvider,
        GmailSenderProvider,
        SenderAccountService,
        SendDispatcherService,
        CircuitBreakerService,
        EnrollmentService,
        DrizzleService,
        SettingsService,
      ],
    }).compile();
    // .compile() alone doesn't run lifecycle hooks (onModuleInit) — .init()
    // does, which is what SettingsService needs to auto-generate/load
    // TRACKING_SIGNING_SECRET before TrackingService reads it.
    await moduleRef.init();

    processor = moduleRef.get(CampaignSendProcessor);
    service = moduleRef.get(CampaignsService);
    drizzle = moduleRef.get(DrizzleService);
    queue = moduleRef.get<Queue>(getQueueToken('campaign-send'));
    // init() above also boots the real BullMQ worker for this queue — pause
    // it so enqueued recipient jobs don't race the direct process() calls
    // below (each test drives the jobs itself, deterministically).
    await queue.pause();

    const [template] = await drizzle.db
      .insert(templates)
      .values({
        name: 'Campaign test template',
        subjectLines: ['Hi {{contact.firstName}}'],
        bodyJson: { type: 'doc', content: [] },
        bodyHtml: '<p>Hello {{contact.firstName}}</p>',
        bodyText: 'Hello {{contact.firstName}}',
      })
      .returning();
    templateId = template.id;

    const [list] = await drizzle.db
      .insert(lists)
      .values({ name: 'Campaign test list' })
      .returning();
    listId = list.id;

    const [normal] = await drizzle.db
      .insert(contacts)
      .values({
        email: `campaign-normal-${Date.now()}@example.com`,
        firstName: 'Normal',
      })
      .returning();
    normalContactId = normal.id;

    const [suppressed] = await drizzle.db
      .insert(contacts)
      .values({
        email: `campaign-suppressed-${Date.now()}@example.com`,
        firstName: 'Suppressed',
      })
      .returning();
    suppressedContactId = suppressed.id;

    await drizzle.db.insert(contactLists).values([
      { listId, contactId: normalContactId },
      { listId, contactId: suppressedContactId },
    ]);
    await drizzle.db
      .insert(suppressionList)
      .values({
        email: suppressed.email,
        reason: 'manual_unsubscribe',
        source: 'test',
      });
  });

  afterAll(async () => {
    await queue.drain();
    // Pause state lives in Redis, shared with any local dev worker — don't
    // leave the queue paused for anything outside this spec.
    await queue.resume();
    await drizzle.db.delete(sends).where(eq(sends.templateId, templateId));
    await drizzle.db
      .delete(campaigns)
      .where(eq(campaigns.templateId, templateId));
    await drizzle.db
      .delete(contactLists)
      .where(eq(contactLists.listId, listId));
    await drizzle.db.delete(lists).where(eq(lists.id, listId));
    await drizzle.db.delete(templates).where(eq(templates.id, templateId));
    await drizzle.db.delete(contacts).where(eq(contacts.id, normalContactId));
    await drizzle.db
      .delete(contacts)
      .where(eq(contacts.id, suppressedContactId));
    // Stops the real BullMQ worker + closes the pg pool — without this the
    // worker keeps firing against later suites' Redis state.
    await moduleRef.close();
  });

  async function runFullSend(campaignId: string, contactIds: string[]) {
    const fanOut = await processor.process(job('fan-out', { campaignId }));
    expect(fanOut).toEqual({ enqueued: contactIds.length });
    for (const contactId of contactIds) {
      await processor.process(
        job('recipient', { campaignId, contactId, total: contactIds.length }),
      );
    }
  }

  async function campaignRow(id: string) {
    const [row] = await drizzle.db.select().from(campaigns).where(eq(campaigns.id, id));
    return row;
  }

  it('fan-out enqueues one job per recipient; recipients record a suppressed send and a real (SES-unconfigured -> failed) send, never faking success', async () => {
    const [campaign] = await drizzle.db
      .insert(campaigns)
      .values({ name: 'Real send test', templateId, listIds: [listId] })
      .returning();

    await runFullSend(campaign.id, [normalContactId, suppressedContactId]);

    const rows = await drizzle.db
      .select()
      .from(sends)
      .where(eq(sends.campaignId, campaign.id));
    expect(rows.length).toBe(2);

    const suppressedRow = rows.find(
      (r) => r.contactId === suppressedContactId,
    )!;
    expect(suppressedRow.status).toBe('suppressed');

    const normalRow = rows.find((r) => r.contactId === normalContactId)!;
    expect(normalRow.status).toBe('failed'); // real attempt, no AWS creds locally — expected, never faked
    expect(normalRow.resolvedSubject).toBe('Hi Normal'); // personalization resolved

    const finalCampaign = await campaignRow(campaign.id);
    expect(finalCampaign.status).toBe('failed'); // 1/1 non-suppressed real attempt failed
    expect(finalCampaign.suppressedCount).toBe(1);
    expect(finalCampaign.failedCount).toBe(1);

    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
  });

  it('a dry-run campaign never reaches the real sender', async () => {
    const [campaign] = await drizzle.db
      .insert(campaigns)
      .values({
        name: 'Dry run test',
        templateId,
        listIds: [listId],
        isDryRun: true,
      })
      .returning();

    await runFullSend(campaign.id, [normalContactId, suppressedContactId]);

    const normalRow = (
      await drizzle.db
        .select()
        .from(sends)
        .where(eq(sends.campaignId, campaign.id))
    ).find((r) => r.contactId === normalContactId)!;
    expect(normalRow.status).toBe('sent');
    expect(normalRow.isDryRun).toBe(true);
    expect(normalRow.providerMessageId).toBeNull();

    const finalCampaign = await campaignRow(campaign.id);
    expect(finalCampaign.status).toBe('sent');

    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
  });

  it('re-firing fan-out for an already-sending/sent campaign is a no-op (invariant 3 pattern)', async () => {
    const [campaign] = await drizzle.db
      .insert(campaigns)
      .values({
        name: 'No-op retest',
        templateId,
        listIds: [listId],
        status: 'sent',
      })
      .returning();

    const result = await processor.process(job('fan-out', { campaignId: campaign.id }));
    expect(result).toEqual({ skipped: true });

    const rows = await drizzle.db
      .select()
      .from(sends)
      .where(eq(sends.campaignId, campaign.id));
    expect(rows.length).toBe(0);

    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
  });

  it('a pre-split legacy "send" job is treated as fan-out', async () => {
    const [campaign] = await drizzle.db
      .insert(campaigns)
      .values({ name: 'Legacy job test', templateId, listIds: [listId], isDryRun: true })
      .returning();

    const result = await processor.process(job('send', { campaignId: campaign.id }));
    expect(result).toEqual({ enqueued: 2 });

    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
    // Recipient jobs for this campaign sit in Redis — drain so they never fire.
    await queue.drain();
  });

  it('an idempotent recipient retry never re-emails or double-counts', async () => {
    const [campaign] = await drizzle.db
      .insert(campaigns)
      .values({ name: 'Idempotent retry test', templateId, listIds: [listId], isDryRun: true })
      .returning();

    await processor.process(job('fan-out', { campaignId: campaign.id }));
    const data = { campaignId: campaign.id, contactId: normalContactId, total: 2 };
    const first = await processor.process(job('recipient', data));
    expect(first).toEqual(expect.objectContaining({ sent: true }));
    const second = await processor.process(job('recipient', data));
    expect(second).toEqual({ skipped: true });

    const rows = await drizzle.db
      .select()
      .from(sends)
      .where(eq(sends.campaignId, campaign.id));
    expect(rows.filter((r) => r.contactId === normalContactId).length).toBe(1);

    await drizzle.db.delete(sends).where(eq(sends.campaignId, campaign.id));
    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
    await queue.drain();
  });

  it('resumeCampaign() requeues only the missing recipients after a simulated crash and finalizes', async () => {
    const [campaign] = await drizzle.db
      .insert(campaigns)
      // Simulate a worker that died mid-send: status stuck, one sends row
      // written, counters never bumped.
      .values({ name: 'Crash resume test', templateId, listIds: [listId], isDryRun: true, status: 'sending' })
      .returning();
    await drizzle.db.insert(sends).values({
      contactId: suppressedContactId,
      templateId,
      campaignId: campaign.id,
      provider: 'ses',
      resolvedSubject: 'x',
      resolvedBodyHtml: 'x',
      resolvedBodyText: 'x',
      status: 'suppressed',
      isDryRun: true,
    });

    const resumed = await service.resumeCampaign(campaign.id);
    expect(resumed).toEqual({ id: campaign.id, resumed: true, requeued: 1 });

    // The already-done recipient must not get a second job…
    expect(await queue.getJob(`${campaign.id}--${suppressedContactId}`)).toBeUndefined();
    // …while the missing one does.
    expect(await queue.getJob(`${campaign.id}--${normalContactId}`)).toBeDefined();

    await processor.process(
      job('recipient', { campaignId: campaign.id, contactId: normalContactId, total: 2 }),
    );

    const finalCampaign = await campaignRow(campaign.id);
    expect(finalCampaign.status).toBe('sent');
    // Counters were never bumped before the "crash" — the idempotent path
    // re-derived them from the rows instead of wedging.
    expect(finalCampaign.sentCount).toBe(1);
    expect(finalCampaign.suppressedCount).toBe(1);

    await drizzle.db.delete(sends).where(eq(sends.campaignId, campaign.id));
    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
    await queue.drain();
  });
});
