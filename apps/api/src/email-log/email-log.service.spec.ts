import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { EmailLogService } from './email-log.service';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, templates, sends, emailEvents } from '../db/schema';

describe('EmailLogService (integration, real DB) — GC-060', () => {
  let service: EmailLogService;
  let drizzle: DrizzleService;
  let contactId: string;
  let templateId: string;
  let sentId: string;
  let bouncedId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] })],
      providers: [EmailLogService, DrizzleService],
    }).compile();

    service = moduleRef.get(EmailLogService);
    drizzle = moduleRef.get(DrizzleService);

    const [contact] = await drizzle.db.insert(contacts).values({ email: `email-log-test-${Date.now()}@example.com` }).returning();
    contactId = contact.id;
    const [template] = await drizzle.db
      .insert(templates)
      .values({ name: 'Email log test template', subject: 'live subject', bodyJson: { type: 'doc', content: [] }, bodyHtml: '<p>live html</p>', bodyText: 'live text' })
      .returning();
    templateId = template.id;

    const [sent] = await drizzle.db
      .insert(sends)
      .values({
        contactId,
        templateId,
        provider: 'ses',
        resolvedSubject: 'Resolved subject from send time, not the live template',
        resolvedBodyHtml: '<p>Resolved body from send time</p>',
        resolvedBodyText: 'Resolved body from send time',
        status: 'sent',
      })
      .returning();
    sentId = sent.id;
    await drizzle.db.insert(emailEvents).values({ sendId: sentId, type: 'open' });

    const [bounced] = await drizzle.db
      .insert(sends)
      .values({ contactId, templateId, provider: 'ses', resolvedSubject: 'x', resolvedBodyHtml: 'x', resolvedBodyText: 'x', status: 'bounced' })
      .returning();
    bouncedId = bounced.id;

    // Mutate the template after the send — the send's own stored copy
    // must not change (this is what the detail drawer proves).
    await drizzle.db.update(templates).set({ subject: 'template subject changed later' }).where(eq(templates.id, templateId));
  });

  afterAll(async () => {
    await drizzle.db.delete(emailEvents).where(eq(emailEvents.sendId, sentId));
    await drizzle.db.delete(sends).where(eq(sends.id, sentId));
    await drizzle.db.delete(sends).where(eq(sends.id, bouncedId));
    await drizzle.db.delete(templates).where(eq(templates.id, templateId));
    await drizzle.db.delete(contacts).where(eq(contacts.id, contactId));
  });

  it('filters by status', async () => {
    const bouncedOnly = await service.list({ status: 'bounced', limit: 100 });
    expect(bouncedOnly.some((s) => s.id === sentId)).toBe(false);
    expect(bouncedOnly.some((s) => s.id === bouncedId)).toBe(true);
  });

  it('detail drawer shows the real resolved subject/body stored on the send, not the (since-changed) live template, plus real event history', async () => {
    const detail = await service.getDetail(sentId);
    expect(detail.send.resolvedSubject).toBe('Resolved subject from send time, not the live template');
    expect(detail.send.resolvedSubject).not.toContain('changed later');
    expect(detail.events).toHaveLength(1);
    expect(detail.events[0].type).toBe('open');
  });
});
