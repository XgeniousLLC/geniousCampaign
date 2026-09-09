import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { sequenceEnrollments, sequenceSteps, sequences, contacts, sends } from '../db/schema';
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

  async enroll(sequenceId: string, contactId: string, db: DbOrTx = this.drizzle.db) {
    const sequence = await db.query.sequences.findFirst({ where: eq(sequences.id, sequenceId) });
    if (!sequence) {
      throw new NotFoundException(`Sequence ${sequenceId} not found`);
    }
    if (!sequence.isActive) {
      // Single choke point (this method) covers manual enroll, the public
      // API, and trigger-driven auto-enroll (TriggerEvaluationService calls
      // this same method) — an inactive sequence rejects all three alike.
      throw new ConflictException(`Sequence ${sequenceId} is not active`);
    }
    const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    const existingActive = await db.query.sequenceEnrollments.findFirst({
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
    const allSteps = await db
      .select()
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId))
      .orderBy(asc(sequenceSteps.order));

    const resolution = resolveFirstExecutableStep(allSteps, new Date());

    const [created] = await db
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
      const [completed] = await db
        .update(sequenceEnrollments)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(sequenceEnrollments.id, created.id))
        .returning();
      return completed;
    }

    return created;
  }

  async pause(enrollmentId: string, db: DbOrTx = this.drizzle.db) {
    const enrollment = await this.findOne(enrollmentId, db);
    if (enrollment.status !== 'active') {
      throw new ConflictException(`Enrollment ${enrollmentId} is ${enrollment.status}, not active — cannot pause`);
    }
    return this.setStatus(enrollmentId, 'paused', db);
  }

  async resume(enrollmentId: string, db: DbOrTx = this.drizzle.db) {
    const enrollment = await this.findOne(enrollmentId, db);
    if (enrollment.status !== 'paused') {
      throw new ConflictException(`Enrollment ${enrollmentId} is ${enrollment.status}, not paused — cannot resume`);
    }
    return this.setStatus(enrollmentId, 'active', db);
  }

  async stop(enrollmentId: string, db: DbOrTx = this.drizzle.db) {
    const enrollment = await this.findOne(enrollmentId, db);
    if (enrollment.status === 'stopped' || enrollment.status === 'completed') {
      throw new ConflictException(`Enrollment ${enrollmentId} is already ${enrollment.status}`);
    }
    const [updated] = await db
      .update(sequenceEnrollments)
      .set({ status: 'stopped', currentStepId: null, nextRunAt: null, updatedAt: new Date() })
      .where(eq(sequenceEnrollments.id, enrollmentId))
      .returning();
    return updated;
  }

  async findOne(id: string, db: DbOrTx = this.drizzle.db) {
    const enrollment = await db.query.sequenceEnrollments.findFirst({
      where: eq(sequenceEnrollments.id, id),
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${id} not found`);
    }
    return enrollment;
  }

  /** Read-only, any status — used by the public API to make its enroll
   * endpoint idempotent against repeated calls for the same contact+sequence
   * (e.g. a cart-abandon webhook retried by the sender). Deliberately
   * doesn't touch enroll()'s own re-enrollment rules, which every other
   * caller (admin UI, trigger auto-enroll) still relies on — a fresh row
   * after stop/complete stays legal there (invariant 1, see the "allows
   * re-enrolling after being stopped" spec case). */
  async findMostRecentForContactInSequence(sequenceId: string, contactId: string, db: DbOrTx = this.drizzle.db) {
    return db.query.sequenceEnrollments.findFirst({
      where: and(eq(sequenceEnrollments.sequenceId, sequenceId), eq(sequenceEnrollments.contactId, contactId)),
      orderBy: (e, { desc }) => desc(e.enrolledAt),
    });
  }

  async findActiveForContactInSequence(sequenceId: string, contactId: string, db: DbOrTx = this.drizzle.db) {
    const enrollment = await db.query.sequenceEnrollments.findFirst({
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

  /** Stops every active/paused enrollment a contact has, across all
   * sequences — enrollment is per-(sequence, contact) with no shared clock
   * (invariant 1), so "stop everywhere" is inherently a loop over each one,
   * not a single row update. Reuses stop() so each transition is identical
   * to a single-sequence stop, just applied per enrollment. */
  async stopAllForContact(contactId: string, db: DbOrTx = this.drizzle.db) {
    const active = await db.query.sequenceEnrollments.findMany({
      where: and(eq(sequenceEnrollments.contactId, contactId), inArray(sequenceEnrollments.status, ['active', 'paused'])),
    });
    const stopped: (typeof sequenceEnrollments.$inferSelect)[] = [];
    for (const enrollment of active) {
      stopped.push(await this.stop(enrollment.id, db));
    }
    return stopped;
  }

  async listForContact(contactId: string) {
    const enrollments = await this.drizzle.db.query.sequenceEnrollments.findMany({
      where: eq(sequenceEnrollments.contactId, contactId),
      orderBy: (e, { desc }) => desc(e.enrolledAt),
    });
    return this.attachHistory(enrollments);
  }

  async listForSequence(sequenceId: string) {
    const enrollments = await this.drizzle.db.query.sequenceEnrollments.findMany({
      where: eq(sequenceEnrollments.sequenceId, sequenceId),
      orderBy: (e, { desc }) => desc(e.enrolledAt),
    });
    return this.attachHistory(enrollments);
  }

  /** Adds display-only history to each enrollment row — the "step N" number
   * for currentStepId (matching the Steps tab's send-step-only numbering,
   * SequenceBuilder.tsx's buildBlocks) plus the last step actually executed
   * and when, derived from `sends` (the enrollment row itself only tracks
   * what's next per invariant 3 — it never stored what already ran). */
  private async attachHistory(enrollments: (typeof sequenceEnrollments.$inferSelect)[]) {
    if (enrollments.length === 0) return [];
    const enrollmentIds = enrollments.map((e) => e.id);
    const sequenceIds = [...new Set(enrollments.map((e) => e.sequenceId))];

    const [lastSends, allSteps] = await Promise.all([
      this.drizzle.db
        .select({
          sequenceEnrollmentId: sends.sequenceEnrollmentId,
          sequenceStepId: sends.sequenceStepId,
          sentAt: sends.sentAt,
          createdAt: sends.createdAt,
        })
        .from(sends)
        .where(inArray(sends.sequenceEnrollmentId, enrollmentIds))
        .orderBy(desc(sends.createdAt)),
      this.drizzle.db
        .select()
        .from(sequenceSteps)
        .where(inArray(sequenceSteps.sequenceId, sequenceIds))
        .orderBy(asc(sequenceSteps.order)),
    ]);

    // `lastSends` is ordered newest-first, so the first row seen per
    // enrollment is its most recent send.
    const lastSendByEnrollment = new Map<string, (typeof lastSends)[number]>();
    for (const send of lastSends) {
      if (send.sequenceEnrollmentId && !lastSendByEnrollment.has(send.sequenceEnrollmentId)) {
        lastSendByEnrollment.set(send.sequenceEnrollmentId, send);
      }
    }

    // Step numbers count only send_email steps in order, per sequence —
    // wait/condition/exit steps aren't numbered (same rule as buildBlocks).
    const stepNumberByStepId = new Map<string, number>();
    const sendStepCountBySequence = new Map<string, number>();
    for (const step of allSteps) {
      if (step.type !== 'send_email') continue;
      const count = (sendStepCountBySequence.get(step.sequenceId) ?? 0) + 1;
      sendStepCountBySequence.set(step.sequenceId, count);
      stepNumberByStepId.set(step.id, count);
    }

    return enrollments.map((e) => {
      const lastSend = lastSendByEnrollment.get(e.id);
      return {
        ...e,
        currentStepNumber: e.currentStepId ? stepNumberByStepId.get(e.currentStepId) ?? null : null,
        lastStepNumber: lastSend?.sequenceStepId ? stepNumberByStepId.get(lastSend.sequenceStepId) ?? null : null,
        lastExecutedAt: lastSend ? lastSend.sentAt ?? lastSend.createdAt : null,
      };
    });
  }

  private async setStatus(id: string, status: 'active' | 'paused', db: DbOrTx = this.drizzle.db) {
    const [updated] = await db
      .update(sequenceEnrollments)
      .set({ status, updatedAt: new Date() })
      .where(eq(sequenceEnrollments.id, id))
      .returning();
    return updated;
  }
}
