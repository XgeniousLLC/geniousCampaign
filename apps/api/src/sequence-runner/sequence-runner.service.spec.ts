import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { eq } from 'drizzle-orm';
import { SequenceRunnerService } from './sequence-runner.service';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { SesSenderProvider } from '../sending/ses-sender.provider';
import { SuppressionService } from '../suppression/suppression.service';
import { TrackingService } from '../tracking/tracking.service';
import { OutboundWebhookDispatchService } from '../outbound-webhooks/outbound-webhook-dispatch.service';
import { OutboundWebhookSubscriptionsService } from '../outbound-webhooks/outbound-webhook-subscriptions.service';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, sequences, sequenceSteps, sequenceEnrollments, sends, templates } from '../db/schema';

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
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({ connection: { url: config.get<string>('REDIS_URL') } }),
        }),
        BullModule.registerQueue({ name: 'outbound-webhooks' }),
      ],
      providers: [
        SequenceRunnerService,
        EnrollmentService,
        SesSenderProvider,
        SuppressionService,
        TrackingService,
        OutboundWebhookDispatchService,
        OutboundWebhookSubscriptionsService,
        DrizzleService,
      ],
    }).compile();

    runner = moduleRef.get(SequenceRunnerService);
    enrollmentService = moduleRef.get(EnrollmentService);
    drizzle = moduleRef.get(DrizzleService);

    const [contact] = await drizzle.db
      .insert(contacts)
      .values({ email: `runner-test-${Date.now()}@example.com`, firstName: 'Ada' })
      .returning();
    contactId = contact.id;

    const [template] = await drizzle.db
      .insert(templates)
      .values({
        name: 'Runner test template',
        subject: 'Hi {{contact.firstName}}',
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
    const [sequence] = await drizzle.db.insert(sequences).values({ name: 'Pause test sequence', webhookSecret: 'test-secret' }).returning();
    sequenceId = sequence.id;
    await drizzle.db.insert(sequenceSteps).values({ sequenceId, order: 0, type: 'send_email', templateId });

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

    const sendRows = await drizzle.db.select().from(sends).where(eq(sends.sequenceEnrollmentId, enrollment.id));
    expect(sendRows.length).toBe(0);
  });

  it('runs a 3-step sequence end-to-end (send_email -> wait -> exit)', async () => {
    const [sequence] = await drizzle.db.insert(sequences).values({ name: 'Full run sequence', webhookSecret: 'test-secret' }).returning();
    const fullSequenceId = sequence.id;
    await drizzle.db.insert(sequenceSteps).values([
      { sequenceId: fullSequenceId, order: 0, type: 'send_email', templateId },
      { sequenceId: fullSequenceId, order: 1, type: 'wait', delayValue: 1, delayUnit: 'minutes' },
      { sequenceId: fullSequenceId, order: 2, type: 'exit' },
    ]);

    const enrollment = await enrollmentService.enroll(fullSequenceId, contactId);

    // Tick 1: executes the send_email step (fails without real AWS creds —
    // that's expected and asserted below), advances into the wait.
    let result = await runner.tick();
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const afterSend = await enrollmentService.findOne(enrollment.id);
    expect(afterSend.status).toBe('active');
    expect(afterSend.nextRunAt!.getTime()).toBeGreaterThan(Date.now() + 30_000); // ~1 minute out

    const sendRows = await drizzle.db.select().from(sends).where(eq(sends.sequenceEnrollmentId, enrollment.id));
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
});
