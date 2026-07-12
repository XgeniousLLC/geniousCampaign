import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { CircuitBreakerService } from './circuit-breaker.service';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { DrizzleService } from '../db/drizzle.service';
import { contacts, sequences, sequenceSteps, sequenceEnrollments, sends, templates, breakerEvaluations, breakerResets } from '../db/schema';

describe('CircuitBreakerService (integration, real DB)', () => {
  let breaker: CircuitBreakerService;
  let enrollmentService: EnrollmentService;
  let drizzle: DrizzleService;
  let contactId: string;
  let templateId: string;
  let sequenceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }), EventEmitterModule.forRoot()],
      providers: [CircuitBreakerService, EnrollmentService, DrizzleService],
    }).compile();

    // Small window/threshold so a handful of test sends can deterministically trip it.
    const realConfig = moduleRef.get(ConfigService);
    const overrides: Record<string, string> = { CIRCUIT_BREAKER_WINDOW_SIZE: '20', CIRCUIT_BREAKER_THRESHOLD_PCT: '20' };
    jest.spyOn(realConfig, 'get').mockImplementation(
      ((key: string) => overrides[key] ?? ConfigService.prototype.get.call(realConfig, key)) as typeof realConfig.get,
    );

    breaker = moduleRef.get(CircuitBreakerService);
    enrollmentService = moduleRef.get(EnrollmentService);
    drizzle = moduleRef.get(DrizzleService);

    const [contact] = await drizzle.db.insert(contacts).values({ email: `breaker-test-${Date.now()}@example.com` }).returning();
    contactId = contact.id;
    const [template] = await drizzle.db
      .insert(templates)
      .values({ name: 'Breaker test template', subject: 'Hi', bodyJson: { type: 'doc', content: [] }, bodyHtml: '<p>Hi</p>', bodyText: 'Hi' })
      .returning();
    templateId = template.id;
    const [sequence] = await drizzle.db.insert(sequences).values({ name: 'Breaker test sequence', webhookSecret: 'test-secret' }).returning();
    sequenceId = sequence.id;
    await drizzle.db.insert(sequenceSteps).values({ sequenceId, order: 0, type: 'exit' });
  });

  afterAll(async () => {
    await drizzle.db.delete(sends).where(eq(sends.templateId, templateId));
    await drizzle.db.delete(sequenceEnrollments).where(eq(sequenceEnrollments.sequenceId, sequenceId));
    await drizzle.db.delete(sequenceSteps).where(eq(sequenceSteps.sequenceId, sequenceId));
    await drizzle.db.delete(sequences).where(eq(sequences.id, sequenceId));
    await drizzle.db.delete(templates).where(eq(templates.id, templateId));
    await drizzle.db.delete(contacts).where(eq(contacts.id, contactId));
    await drizzle.db.delete(breakerEvaluations);
    await drizzle.db.delete(breakerResets);
  });

  it('does not trip on a healthy send history', async () => {
    for (let i = 0; i < 20; i++) {
      await drizzle.db.insert(sends).values({
        contactId,
        templateId,
        provider: 'ses',
        resolvedSubject: 'x',
        resolvedBodyHtml: 'x',
        resolvedBodyText: 'x',
        status: 'sent',
      });
    }

    const result = await breaker.evaluate();
    expect(result.tripped).toBe(false);
    expect(await breaker.isTripped()).toBe(false);
  });

  it('trips on a bounce burst and pauses active enrollments, then a reset un-trips it', async () => {
    const enrollment = await enrollmentService.enroll(sequenceId, contactId);

    // 5 of the last 20 sends bounced = 25%, above the 20% test threshold.
    for (let i = 0; i < 5; i++) {
      await drizzle.db.insert(sends).values({
        contactId,
        templateId,
        provider: 'ses',
        resolvedSubject: 'x',
        resolvedBodyHtml: 'x',
        resolvedBodyText: 'x',
        status: 'bounced',
      });
    }

    const result = await breaker.evaluate();
    expect(result.tripped).toBe(true);
    expect(result.pausedEnrollmentCount).toBeGreaterThanOrEqual(1);
    expect(await breaker.isTripped()).toBe(true);

    const paused = await enrollmentService.findOne(enrollment.id);
    expect(paused.status).toBe('paused'); // real EnrollmentService.pause() call, not a bypassed bulk update

    await breaker.reset(null);
    expect(await breaker.isTripped()).toBe(false);
  });
});
