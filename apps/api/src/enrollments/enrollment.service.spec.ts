import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { EnrollmentService } from './enrollment.service';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, sequences, sequenceSteps, sends } from '../db/schema';

describe('EnrollmentService (integration, real DB)', () => {
  let service: EnrollmentService;
  let drizzle: DrizzleService;
  let contactId: string;
  let sequenceId: string;
  let step1Id: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: ['../../.env', '.env'] })],
      providers: [EnrollmentService, DrizzleService],
    }).compile();

    service = moduleRef.get(EnrollmentService);
    drizzle = moduleRef.get(DrizzleService);

    const [contact] = await drizzle.db
      .insert(contacts)
      .values({ email: `enrollment-test-${Date.now()}@example.com` })
      .returning();
    contactId = contact.id;

    const [sequence] = await drizzle.db.insert(sequences).values({ name: 'Test sequence', webhookSecret: 'test-secret' }).returning();
    sequenceId = sequence.id;

    const [step1] = await drizzle.db
      .insert(sequenceSteps)
      .values({ sequenceId, order: 0, type: 'send_email' })
      .returning();
    step1Id = step1.id;
    await drizzle.db.insert(sequenceSteps).values({ sequenceId, order: 1, type: 'exit' });
  });

  afterAll(async () => {
    await drizzle.db.delete(sequences).where(eq(sequences.id, sequenceId));
    await drizzle.db.delete(contacts).where(eq(contacts.id, contactId));
  });

  it('enrolls a contact starting at the first step', async () => {
    const enrollment = await service.enroll(sequenceId, contactId);
    expect(enrollment.status).toBe('active');
    expect(enrollment.currentStepId).toBe(step1Id);
    expect(enrollment.nextRunAt).not.toBeNull();
  });

  it('surfaces the last executed step/time via listForContact, derived from sends', async () => {
    const enrollment = await service.findActiveForContactInSequence(sequenceId, contactId);
    const sentAt = new Date();
    await drizzle.db.insert(sends).values({
      contactId,
      sequenceEnrollmentId: enrollment.id,
      sequenceId,
      sequenceStepId: step1Id,
      resolvedSubject: 'Test',
      resolvedBodyHtml: '<p>Test</p>',
      resolvedBodyText: 'Test',
      status: 'sent',
      sentAt,
    });

    const [listed] = await service.listForContact(contactId);
    expect(listed.currentStepNumber).toBe(1);
    expect(listed.lastStepNumber).toBe(1);
    expect(listed.lastExecutedAt).toEqual(sentAt);
  });

  it('rejects a duplicate enroll attempt while active', async () => {
    await expect(service.enroll(sequenceId, contactId)).rejects.toThrow(/already has an active enrollment/);
  });

  it('pauses then resumes', async () => {
    const enrollment = await service.findActiveForContactInSequence(sequenceId, contactId);
    const paused = await service.pause(enrollment.id);
    expect(paused.status).toBe('paused');

    await expect(service.pause(enrollment.id)).rejects.toThrow(/not active/);

    const resumed = await service.resume(enrollment.id);
    expect(resumed.status).toBe('active');
  });

  it('stops an enrollment and clears its step/schedule', async () => {
    const enrollment = await service.findActiveForContactInSequence(sequenceId, contactId);
    const stopped = await service.stop(enrollment.id);
    expect(stopped.status).toBe('stopped');
    expect(stopped.currentStepId).toBeNull();
    expect(stopped.nextRunAt).toBeNull();
  });

  it('allows re-enrolling after being stopped (fresh row, per invariant 1)', async () => {
    const fresh = await service.enroll(sequenceId, contactId);
    expect(fresh.status).toBe('active');
    expect(fresh.currentStepId).toBe(step1Id);

    const all = await service.listForContact(contactId);
    expect(all.length).toBe(2);
  });

  it('completes immediately for a zero-step sequence', async () => {
    const [emptySeq] = await drizzle.db.insert(sequences).values({ name: 'Empty sequence', webhookSecret: 'test-secret' }).returning();
    const enrollment = await service.enroll(emptySeq.id, contactId);
    expect(enrollment.status).toBe('completed');
    await drizzle.db.delete(sequences).where(eq(sequences.id, emptySeq.id));
  });

  it('rejects enrollment into a disabled sequence', async () => {
    const [disabledSeq] = await drizzle.db
      .insert(sequences)
      .values({ name: 'Disabled sequence', webhookSecret: 'test-secret', isActive: false })
      .returning();
    await expect(service.enroll(disabledSeq.id, contactId)).rejects.toThrow(/not active/);
    await drizzle.db.delete(sequences).where(eq(sequences.id, disabledSeq.id));
  });
});
