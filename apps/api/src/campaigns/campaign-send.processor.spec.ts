import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { CampaignSendProcessor } from './campaign-send.processor';
import { CampaignsService } from './campaigns.service';
import { ListsService } from '../lists/lists.service';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { SesSenderProvider } from '../sending/ses-sender.provider';
import { GmailSenderProvider } from '../sending/gmail-sender.provider';
import { SenderAccountService } from '../sending/sender-account.service';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import { contacts, templates, lists, campaigns, contactLists, sends, suppressionList } from '../db/schema';

describe('CampaignSendProcessor (integration, real DB)', () => {
  let processor: CampaignSendProcessor;
  let drizzle: DrizzleService;
  let templateId: string;
  let listId: string;
  let normalContactId: string;
  let suppressedContactId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({ connection: { url: config.get<string>('REDIS_URL') } }),
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

    processor = moduleRef.get(CampaignSendProcessor);
    drizzle = moduleRef.get(DrizzleService);

    const [template] = await drizzle.db
      .insert(templates)
      .values({
        name: 'Campaign test template',
        subject: 'Hi {{contact.firstName}}',
        bodyJson: { type: 'doc', content: [] },
        bodyHtml: '<p>Hello {{contact.firstName}}</p>',
        bodyText: 'Hello {{contact.firstName}}',
      })
      .returning();
    templateId = template.id;

    const [list] = await drizzle.db.insert(lists).values({ name: 'Campaign test list' }).returning();
    listId = list.id;

    const [normal] = await drizzle.db
      .insert(contacts)
      .values({ email: `campaign-normal-${Date.now()}@example.com`, firstName: 'Normal' })
      .returning();
    normalContactId = normal.id;

    const [suppressed] = await drizzle.db
      .insert(contacts)
      .values({ email: `campaign-suppressed-${Date.now()}@example.com`, firstName: 'Suppressed' })
      .returning();
    suppressedContactId = suppressed.id;

    await drizzle.db.insert(contactLists).values([
      { listId, contactId: normalContactId },
      { listId, contactId: suppressedContactId },
    ]);
    await drizzle.db.insert(suppressionList).values({ email: suppressed.email, reason: 'manual_unsubscribe', source: 'test' });
  });

  afterAll(async () => {
    await drizzle.db.delete(sends).where(eq(sends.templateId, templateId));
    await drizzle.db.delete(campaigns).where(eq(campaigns.templateId, templateId));
    await drizzle.db.delete(contactLists).where(eq(contactLists.listId, listId));
    await drizzle.db.delete(lists).where(eq(lists.id, listId));
    await drizzle.db.delete(templates).where(eq(templates.id, templateId));
    await drizzle.db.delete(contacts).where(eq(contacts.id, normalContactId));
    await drizzle.db.delete(contacts).where(eq(contacts.id, suppressedContactId));
  });

  it('records a suppressed send and a real (SES-unconfigured -> failed) send, never faking success', async () => {
    const [campaign] = await drizzle.db.insert(campaigns).values({ name: 'Real send test', templateId, listIds: [listId] }).returning();

    const result = await processor.process({ data: { campaignId: campaign.id } } as Job<{ campaignId: string }>);
    expect(result).toEqual(expect.objectContaining({ sentCount: 0, failedCount: 1, suppressedCount: 1 }));

    const rows = await drizzle.db.select().from(sends).where(eq(sends.campaignId, campaign.id));
    expect(rows.length).toBe(2);

    const suppressedRow = rows.find((r) => r.contactId === suppressedContactId)!;
    expect(suppressedRow.status).toBe('suppressed');

    const normalRow = rows.find((r) => r.contactId === normalContactId)!;
    expect(normalRow.status).toBe('failed'); // real attempt, no AWS creds locally — expected, never faked
    expect(normalRow.resolvedSubject).toBe('Hi Normal'); // personalization resolved

    const [finalCampaign] = await drizzle.db.select().from(campaigns).where(eq(campaigns.id, campaign.id));
    expect(finalCampaign.status).toBe('failed'); // 1/1 non-suppressed real attempt failed
    expect(finalCampaign.suppressedCount).toBe(1);

    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
  });

  it('a dry-run campaign never reaches the real sender', async () => {
    const [campaign] = await drizzle.db
      .insert(campaigns)
      .values({ name: 'Dry run test', templateId, listIds: [listId], isDryRun: true })
      .returning();

    const result = await processor.process({ data: { campaignId: campaign.id } } as Job<{ campaignId: string }>);
    expect(result).toEqual(expect.objectContaining({ sentCount: 1, failedCount: 0, suppressedCount: 1 }));

    const normalRow = (await drizzle.db.select().from(sends).where(eq(sends.campaignId, campaign.id))).find(
      (r) => r.contactId === normalContactId,
    )!;
    expect(normalRow.status).toBe('sent');
    expect(normalRow.isDryRun).toBe(true);
    expect(normalRow.providerMessageId).toBeNull();

    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
  });

  it('re-firing a job for an already-sending/sent campaign is a no-op (invariant 3 pattern)', async () => {
    const [campaign] = await drizzle.db
      .insert(campaigns)
      .values({ name: 'No-op retest', templateId, listIds: [listId], status: 'sent' })
      .returning();

    const result = await processor.process({ data: { campaignId: campaign.id } } as Job<{ campaignId: string }>);
    expect(result).toEqual({ skipped: true });

    const rows = await drizzle.db.select().from(sends).where(eq(sends.campaignId, campaign.id));
    expect(rows.length).toBe(0);

    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaign.id));
  });
});
