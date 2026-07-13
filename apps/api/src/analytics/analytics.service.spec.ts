import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { AnalyticsService } from './analytics.service';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, templates, campaigns, sends, emailEvents } from '../db/schema';

describe('AnalyticsService.getOverview (integration, real DB) — GC-058', () => {
  let service: AnalyticsService;
  let drizzle: DrizzleService;
  let contactId: string;
  let templateId: string;
  let campaignId: string;
  const sendIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] })],
      providers: [AnalyticsService, DrizzleService],
    }).compile();

    service = moduleRef.get(AnalyticsService);
    drizzle = moduleRef.get(DrizzleService);

    const [contact] = await drizzle.db.insert(contacts).values({ email: `analytics-test-${Date.now()}@example.com` }).returning();
    contactId = contact.id;
    const [template] = await drizzle.db
      .insert(templates)
      .values({ name: 'Analytics test template', subject: 'Hi', bodyJson: { type: 'doc', content: [] }, bodyHtml: '<p>Hi</p>', bodyText: 'Hi' })
      .returning();
    templateId = template.id;
    const [campaign] = await drizzle.db
      .insert(campaigns)
      .values({ name: 'Analytics test campaign', templateId, listIds: [(await drizzle.db.query.lists.findFirst())!.id] })
      .returning();
    campaignId = campaign.id;

    // 3 sent, 1 bounced, 1 suppressed — a known, hand-countable mix.
    for (let i = 0; i < 3; i++) {
      const [send] = await drizzle.db
        .insert(sends)
        .values({ contactId, templateId, campaignId, provider: 'ses', resolvedSubject: 'x', resolvedBodyHtml: 'x', resolvedBodyText: 'x', status: 'sent' })
        .returning();
      sendIds.push(send.id);
    }
    const [bounced] = await drizzle.db
      .insert(sends)
      .values({ contactId, templateId, campaignId, provider: 'ses', resolvedSubject: 'x', resolvedBodyHtml: 'x', resolvedBodyText: 'x', status: 'bounced' })
      .returning();
    sendIds.push(bounced.id);
    const [suppressed] = await drizzle.db
      .insert(sends)
      .values({ contactId, templateId, campaignId, provider: 'ses', resolvedSubject: 'x', resolvedBodyHtml: 'x', resolvedBodyText: 'x', status: 'suppressed' })
      .returning();
    sendIds.push(suppressed.id);

    // 2 of the 3 sent ones got opened, 1 of those also clicked.
    await drizzle.db.insert(emailEvents).values({ sendId: sendIds[0], type: 'open' });
    await drizzle.db.insert(emailEvents).values({ sendId: sendIds[1], type: 'open' });
    await drizzle.db.insert(emailEvents).values({ sendId: sendIds[1], type: 'click', url: 'https://example.com' });
  });

  afterAll(async () => {
    for (const id of sendIds) {
      await drizzle.db.delete(emailEvents).where(eq(emailEvents.sendId, id));
      await drizzle.db.delete(sends).where(eq(sends.id, id));
    }
    await drizzle.db.delete(campaigns).where(eq(campaigns.id, campaignId));
    await drizzle.db.delete(templates).where(eq(templates.id, templateId));
    await drizzle.db.delete(contacts).where(eq(contacts.id, contactId));
  });

  it('matches a manual count of the exact rows just inserted', async () => {
    const overview = await service.getOverview(1);

    // Manual spot-check against the real rows, not the service's own logic.
    const allSends = await drizzle.db.select().from(sends).where(eq(sends.campaignId, campaignId));
    const manualSentCount = allSends.filter((s) => s.status === 'sent').length;
    const manualBouncedCount = allSends.filter((s) => s.status === 'bounced').length;
    const manualSuppressedCount = allSends.filter((s) => s.status === 'suppressed').length;

    expect(manualSentCount).toBe(3);
    expect(manualBouncedCount).toBe(1);
    expect(manualSuppressedCount).toBe(1);

    // The overview is a 1-day window across the whole system (not scoped to
    // this one campaign), so assert it's at least what we just inserted —
    // other tests' data may coexist in the same window.
    expect(overview.sentCount).toBeGreaterThanOrEqual(manualSentCount);
    expect(overview.bouncedCount).toBeGreaterThanOrEqual(manualBouncedCount);
    expect(overview.suppressedCount).toBeGreaterThanOrEqual(manualSuppressedCount);
    expect(overview.openCount).toBeGreaterThanOrEqual(2);
    expect(overview.clickCount).toBeGreaterThanOrEqual(1);
  });

  it('getRecentCampaigns reports the exact real open/click counts for this campaign', async () => {
    const recent = await service.getRecentCampaigns(50);
    const thisCampaign = recent.find((c) => c.id === campaignId)!;
    expect(thisCampaign).toBeDefined();
    expect(thisCampaign.openCount).toBe(2);
    expect(thisCampaign.clickCount).toBe(1);
  });
});
