import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { CampaignsService } from './campaigns.service';
import { ListsService } from '../lists/lists.service';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, templates, lists, campaigns, contactLists } from '../db/schema';

describe('CampaignsService.send (integration, real DB) — GC-053 pre-send confirmation', () => {
  let service: CampaignsService;
  let drizzle: DrizzleService;
  let templateId: string;
  let listId: string;
  let contactIds: string[] = [];

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
      providers: [CampaignsService, ListsService, DrizzleService],
    }).compile();

    // A tiny threshold (3) so 5 test contacts deterministically count as "large".
    const realConfig = moduleRef.get(ConfigService);
    jest.spyOn(realConfig, 'get').mockImplementation(
      ((key: string) => (key === 'LARGE_SEND_THRESHOLD' ? '3' : ConfigService.prototype.get.call(realConfig, key))) as typeof realConfig.get,
    );

    service = moduleRef.get(CampaignsService);
    drizzle = moduleRef.get(DrizzleService);

    const [template] = await drizzle.db
      .insert(templates)
      .values({ name: 'GC-053 template', subject: 'Hi', bodyJson: { type: 'doc', content: [] }, bodyHtml: '<p>Hi</p>', bodyText: 'Hi' })
      .returning();
    templateId = template.id;
    const [list] = await drizzle.db.insert(lists).values({ name: 'GC-053 list' }).returning();
    listId = list.id;

    for (let i = 0; i < 5; i++) {
      const [contact] = await drizzle.db.insert(contacts).values({ email: `gc053-${i}-${Date.now()}@example.com` }).returning();
      contactIds.push(contact.id);
      await drizzle.db.insert(contactLists).values({ listId, contactId: contact.id });
    }
  });

  afterAll(async () => {
    await drizzle.db.delete(campaigns).where(eq(campaigns.listId, listId));
    await drizzle.db.delete(contactLists).where(eq(contactLists.listId, listId));
    await drizzle.db.delete(lists).where(eq(lists.id, listId));
    await drizzle.db.delete(templates).where(eq(templates.id, templateId));
    for (const id of contactIds) await drizzle.db.delete(contacts).where(eq(contacts.id, id));
  });

  it('blocks a send above the threshold server-side without confirmed:true, and never enqueues a job', async () => {
    const [campaign] = await drizzle.db.insert(campaigns).values({ name: 'Unconfirmed large send', templateId, listId }).returning();

    const result = await service.send(campaign.id);
    expect(result).toEqual({ id: campaign.id, status: 'confirmation_required', recipientCount: 5, threshold: 3 });

    const [reloaded] = await drizzle.db.select().from(campaigns).where(eq(campaigns.id, campaign.id));
    expect(reloaded.status).toBe('draft'); // never enqueued — still draft
  });

  it('proceeds once confirmed:true is explicitly passed', async () => {
    const [campaign] = await drizzle.db.insert(campaigns).values({ name: 'Confirmed large send', templateId, listId }).returning();

    const result = await service.send(campaign.id, true);
    expect(result).toEqual({ id: campaign.id, status: 'queued' });

    const [reloaded] = await drizzle.db.select().from(campaigns).where(eq(campaigns.id, campaign.id));
    expect(reloaded.largeSendConfirmed).toBe(true);
  });
});
