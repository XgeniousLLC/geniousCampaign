import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { sequenceEnrollments, sequenceSteps, sequences, contacts } from '../db/schema';
import { resolveFirstExecutableStep } from '../sequence-runner/step-resolution.util';

/**
 * All enroll/pause/resume/stop state transitions go through this service —
 * called identically by the public HMAC-signed webhook controller (GC-041)
 * and the internal JWT-authenticated admin controller (GC-042). Never
 * duplicate this logic in a second place (CLAUDE.md architectural invariant 2).
 */
@Injectable()
export class EnrollmentService {
  constructor(private readonly drizzle: DrizzleService) {}

  async enroll(sequenceId: string, contactId: string) {
    const sequence = await this.drizzle.db.query.sequences.findFirst({ where: eq(sequences.id, sequenceId) });
    if (!sequence) {
      throw new NotFoundException(`Sequence ${sequenceId} not found`);
    }
    const contact = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    const existingActive = await this.drizzle.db.query.sequenceEnrollments.findFirst({
      where: and(
        eq(sequenceEnrollments.sequenceId, sequenceId),
        eq(sequenceEnrollments.contactId, contactId),
        inArray(sequenceEnrollments.status, ['active', 'paused']),
      ),
    });
    if (existingActive) {
      throw new ConflictException(
        `Contact ${contactId} already has an ${existingActive.status} enrollment in sequence ${sequenceId}`,
      );
    }

    // Per invariant 1: a contact enrolled long after a sequence "started"
    // gets a fresh row starting at step 1 — no shared sequence-wide clock.
    // A leading "wait" step (unusual but valid) is skipped over just like
    // mid-sequence waits are, landing on the first real executable step.
    const allSteps = await this.drizzle.db
      .select()
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId))
      .orderBy(asc(sequenceSteps.order));

    const resolution = resolveFirstExecutableStep(allSteps, new Date());

    const [created] = await this.drizzle.db
      .insert(sequenceEnrollments)
      .values({
        sequenceId,
        contactId,
        status: 'active',
        currentStepId: resolution.done ? null : resolution.stepId,
        nextRunAt: resolution.done ? null : resolution.runAt,
      })
      .returning();

    if (resolution.done) {
      // No executable steps (zero-step, or wait-only sequence): nothing to run.
      const [completed] = await this.drizzle.db
        .update(sequenceEnrollments)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(sequenceEnrollments.id, created.id))
        .returning();
      return completed;
    }

    return created;
  }

  async pause(enrollmentId: string) {
    const enrollment = await this.findOne(enrollmentId);
    if (enrollment.status !== 'active') {
      throw new ConflictException(`Enrollment ${enrollmentId} is ${enrollment.status}, not active — cannot pause`);
    }
    return this.setStatus(enrollmentId, 'paused');
  }

  async resume(enrollmentId: string) {
    const enrollment = await this.findOne(enrollmentId);
    if (enrollment.status !== 'paused') {
      throw new ConflictException(`Enrollment ${enrollmentId} is ${enrollment.status}, not paused — cannot resume`);
    }
    return this.setStatus(enrollmentId, 'active');
  }

  async stop(enrollmentId: string) {
    const enrollment = await this.findOne(enrollmentId);
    if (enrollment.status === 'stopped' || enrollment.status === 'completed') {
      throw new ConflictException(`Enrollment ${enrollmentId} is already ${enrollment.status}`);
    }
    const [updated] = await this.drizzle.db
      .update(sequenceEnrollments)
      .set({ status: 'stopped', currentStepId: null, nextRunAt: null, updatedAt: new Date() })
      .where(eq(sequenceEnrollments.id, enrollmentId))
      .returning();
    return updated;
  }

  async findOne(id: string) {
    const enrollment = await this.drizzle.db.query.sequenceEnrollments.findFirst({
      where: eq(sequenceEnrollments.id, id),
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${id} not found`);
    }
    return enrollment;
  }

  async findActiveForContactInSequence(sequenceId: string, contactId: string) {
    const enrollment = await this.drizzle.db.query.sequenceEnrollments.findFirst({
      where: and(
        eq(sequenceEnrollments.sequenceId, sequenceId),
        eq(sequenceEnrollments.contactId, contactId),
        inArray(sequenceEnrollments.status, ['active', 'paused']),
      ),
    });
    if (!enrollment) {
      throw new NotFoundException(`No active/paused enrollment for contact ${contactId} in sequence ${sequenceId}`);
    }
    return enrollment;
  }

  listForContact(contactId: string) {
    return this.drizzle.db.query.sequenceEnrollments.findMany({
      where: eq(sequenceEnrollments.contactId, contactId),
      orderBy: (e, { desc }) => desc(e.enrolledAt),
    });
  }

  listForSequence(sequenceId: string) {
    return this.drizzle.db.query.sequenceEnrollments.findMany({
      where: eq(sequenceEnrollments.sequenceId, sequenceId),
      orderBy: (e, { desc }) => desc(e.enrolledAt),
    });
  }

  private async setStatus(id: string, status: 'active' | 'paused') {
    const [updated] = await this.drizzle.db
      .update(sequenceEnrollments)
      .set({ status, updatedAt: new Date() })
      .where(eq(sequenceEnrollments.id, id))
      .returning();
    return updated;
  }
}
