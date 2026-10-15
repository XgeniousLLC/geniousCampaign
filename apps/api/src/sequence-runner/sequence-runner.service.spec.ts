import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { SequenceRunnerService } from './sequence-runner.service';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { SesSenderProvider } from '../sending/ses-sender.provider';
import { GmailSenderProvider } from '../sending/gmail-sender.provider';
import { SenderAccountService } from '../sending/sender-account.service';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { DebugLogService } from '../debug-log/debug-log.service';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import {
  contacts,
  sequences,
  sequenceSenders,
  sequenceSteps,
  sequenceStepTemplates,
  sequenceEnrollments,
  senderAccounts,
  sends,
  templates,
} from '../db/schema';

describe('SequenceRunnerService (integration, real DB)', () => {
  let runner: SequenceRunnerService;
  let enrollmentService: EnrollmentService;
  let drizzle: DrizzleService;
  let contactId: string;
  let sequenceId: string;
  let templateId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
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
        EventEmitterModule.forRoot(),
      ],
      providers: [
        SequenceRunnerService,
        EnrollmentService,
        SesSenderProvider,
        GmailSenderProvider,
        SenderAccountService,
        SendDispatcherService,
        CircuitBreakerService,
        SuppressionService,
        TrackingService,
        DebugLogService,
        DrizzleService,
        SettingsService,
      ],
    }).compile();
    // .compile() alone doesn't run lifecycle hooks (onModuleInit) — .init()
    // does, which is what SettingsService needs to auto-generate/load
    // TRACKING_SIGNING_SECRET before TrackingService reads it.
    await moduleRef.init();

    runner = moduleRef.get(SequenceRunnerService);
    enrollmentService = moduleRef.get(EnrollmentService);
    drizzle = moduleRef.get(DrizzleService);

    const [contact] = await drizzle.db
      .insert(contacts)
      .values({
        email: `runner-test-${Date.now()}@example.com`,
        firstName: 'Ada',
      })
      .returning();
    contactId = contact.id;

    const [template] = await drizzle.db
      .insert(templates)
      .values({
        name: 'Runner test template',
        subjectLines: ['Hi {{contact.firstName}}'],
        bodyJson: { type: 'doc', content: [] },
        bodyHtml: '<p>Hello {{contact.firstName}}</p>',
        bodyText: 'Hello {{contact.firstName}}',
      })
      .returning();
    templateId = template.id;
  });

  afterAll(async () => {
    await drizzle.db.delete(sequences).where(eq(sequences.id, sequenceId));
    await drizzle.db.delete(templates).where(eq(templates.id, templateId));
    await drizzle.db.delete(contacts).where(eq(contacts.id, contactId));
  });

  it('does not process a paused enrollment even if its nextRunAt is due (invariant 3)', async () => {
    const [sequence] = await drizzle.db
      .insert(sequences)
      .values({ name: 'Pause test sequence', webhookSecret: 'test-secret' })
      .returning();
    sequenceId = sequence.id;
    const [sendStep] = await drizzle.db
      .insert(sequenceSteps)
      .values({ sequenceId, order: 0, type: 'send_email' })
      .returning();
    await drizzle.db
      .insert(sequenceStepTemplates)
      .values({ sequenceStepId: sendStep.id, templateId });

    const enrollment = await enrollmentService.enroll(sequenceId, contactId);
    await enrollmentService.pause(enrollment.id);

    // Force nextRunAt into the past so it would be picked up if status weren't re-checked.
    await drizzle.db
      .update(sequenceEnrollments)
      .set({ nextRunAt: new Date(Date.now() - 60_000) })
      .where(eq(sequenceEnrollments.id, enrollment.id));

    const result = await runner.tick();
    expect(result.processed).toBe(0);

    const stillPaused = await enrollmentService.findOne(enrollment.id);
    expect(stillPaused.status).toBe('paused');
    expect(stillPaused.currentStepId).toBe(enrollment.currentStepId);

    const sendRows = await drizzle.db
      .select()
      .from(sends)
      .where(eq(sends.sequenceEnrollmentId, enrollment.id));
    expect(sendRows.length).toBe(0);
  });

  it('runs a 3-step sequence end-to-end (send_email -> wait -> exit)', async () => {
    const [sequence] = await drizzle.db
      .insert(sequences)
      .values({ name: 'Full run sequence', webhookSecret: 'test-secret' })
      .returning();
    const fullSequenceId = sequence.id;
    const insertedSteps = await drizzle.db
      .insert(sequenceSteps)
      .values([
        { sequenceId: fullSequenceId, order: 0, type: 'send_email' },
        {
          sequenceId: fullSequenceId,
          order: 1,
          type: 'wait',
          delayValue: 1,
          delayUnit: 'minutes',
        },
        { sequenceId: fullSequenceId, order: 2, type: 'exit' },
      ])
      .returning();
    const fullSendStep = insertedSteps.find((s) => s.type === 'send_email')!;
    await drizzle.db
      .insert(sequenceStepTemplates)
      .values({ sequenceStepId: fullSendStep.id, templateId });

    const enrollment = await enrollmentService.enroll(
      fullSequenceId,
      contactId,
    );

    // Tick 1: executes the send_email step (fails without real AWS creds —
    // that's expected and asserted below), advances into the wait.
    let result = await runner.tick();
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const afterSend = await enrollmentService.findOne(enrollment.id);
    expect(afterSend.status).toBe('active');
    expect(afterSend.nextRunAt!.getTime()).toBeGreaterThan(Date.now() + 30_000); // ~1 minute out

    const sendRows = await drizzle.db
      .select()
      .from(sends)
      .where(eq(sends.sequenceEnrollmentId, enrollment.id));
    expect(sendRows.length).toBe(1);
    expect(sendRows[0].resolvedSubject).toBe('Hi Ada'); // personalization resolved
    expect(['sent', 'failed']).toContain(sendRows[0].status); // real attempt either way, never faked

    // Simulate the 1-minute wait having elapsed (legitimate test technique —
    // avoids a real 60s sleep while still exercising the real tick logic).
    await drizzle.db
      .update(sequenceEnrollments)
      .set({ nextRunAt: new Date(Date.now() - 1000) })
      .where(eq(sequenceEnrollments.id, enrollment.id));

    // Tick 2: executes the exit step.
    result = await runner.tick();
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const final = await enrollmentService.findOne(enrollment.id);
    expect(final.status).toBe('completed');
    expect(final.currentStepId).toBeNull();

    await drizzle.db.delete(sequences).where(eq(sequences.id, fullSequenceId));
  });

  it('pins the first-step sender account for all later steps (sticky multi-sender)', async () => {
    const [sequence] = await drizzle.db
      .insert(sequences)
      .values({ name: 'Sticky sender sequence', webhookSecret: 'test-secret' })
      .returning();
    const stickyId = sequence.id;
    const accounts = await drizzle.db
      .insert(senderAccounts)
      .values([
        {
          provider: 'ses',
          email: `sticky-a-${Date.now()}@example.com`,
          displayName: 'Sticky A',
          dailySendLimit: 1000,
          sentToday: 0,
          sentTodayDate: '2099-01-01',
          isActive: true,
        },
        {
          provider: 'ses',
          email: `sticky-b-${Date.now()}@example.com`,
          displayName: 'Sticky B',
          dailySendLimit: 1000,
          sentToday: 0,
          sentTodayDate: '2099-01-01',
          isActive: true,
        },
      ])
      .returning();
    await drizzle.db
      .insert(sequenceSenders)
      .values(
        accounts.map((a) => ({ sequenceId: stickyId, senderAccountId: a.id })),
      );
    const insertedSteps = await drizzle.db
      .insert(sequenceSteps)
      .values([
        { sequenceId: stickyId, order: 0, type: 'send_email' },
        { sequenceId: stickyId, order: 1, type: 'send_email' },
        { sequenceId: stickyId, order: 2, type: 'exit' },
      ])
      .returning();
    for (const stepId of insertedSteps
      .filter((x: { type: string }) => x.type === 'send_email')
      .map((x: { id: string }) => x.id)) {
      await drizzle.db
        .insert(sequenceStepTemplates)
        .values({ sequenceStepId: stepId, templateId });
    }

    const enrollment = await enrollmentService.enroll(stickyId, contactId);

    // Tick 1 executes step 1 (send fails without real creds — pinning happens
    // at execution, before the attempt, so the log still records the account).
    await runner.tick();
    // Tick 2 executes step 2 immediately (no wait between the two sends).
    await runner.tick();

    const rows = await drizzle.db
      .select()
      .from(sends)
      .where(eq(sends.sequenceEnrollmentId, enrollment.id));
    expect(rows.length).toBe(2);
    expect(rows[0].senderAccountId).not.toBeNull();
    expect(rows[1].senderAccountId).toBe(rows[0].senderAccountId);

    const pinned = await enrollmentService.findOne(enrollment.id);
    expect(pinned.senderAccountId).toBe(rows[0].senderAccountId);

    await drizzle.db.delete(sequences).where(eq(sequences.id, stickyId));
    for (const a of accounts) {
      await drizzle.db
        .delete(senderAccounts)
        .where(eq(senderAccounts.id, a.id));
    }
  });
});
