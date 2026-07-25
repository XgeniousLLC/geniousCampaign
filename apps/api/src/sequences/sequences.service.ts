import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { sequences, sequenceSteps, sequenceEnrollments, sends, emailEvents } from '../db/schema';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Injectable()
export class SequencesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateSequenceDto, db: DbOrTx = this.drizzle.db) {
    const [created] = await db
      .insert(sequences)
      .values({
        name: dto.name,
        description: dto.description,
        senderAccountId: dto.senderAccountId,
        fromName: dto.fromName,
        replyTo: dto.replyTo,
        webhookSecret: randomBytes(32).toString('hex'),
      })
      .returning();
    return created;
  }

  /** Sequences list screen (design: Steps/Enrolled/Open/Status columns)
   * needs real numbers, not placeholders — computed the same aggregation
   * style already used for templates/campaigns, not stored on the row. */
  async findAll() {
    const sequenceRows = await this.drizzle.db.query.sequences.findMany({ orderBy: (s, { desc }) => desc(s.createdAt) });

    const stepCountRows = await this.drizzle.db
      .select({ sequenceId: sequenceSteps.sequenceId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(sequenceSteps)
      .groupBy(sequenceSteps.sequenceId);
    const stepCountBySequence = new Map(stepCountRows.map((r) => [r.sequenceId, r.count]));

    const enrollmentRows = await this.drizzle.db
      .select({
        sequenceId: sequenceEnrollments.sequenceId,
        total: sql<number>`count(*)`.mapWith(Number),
        active: sql<number>`count(*) filter (where ${sequenceEnrollments.status} = 'active')`.mapWith(Number),
      })
      .from(sequenceEnrollments)
      .groupBy(sequenceEnrollments.sequenceId);
    const enrollmentBySequence = new Map(enrollmentRows.map((r) => [r.sequenceId, r]));

    const eventRows = await this.drizzle.db
      .select({
        sequenceId: sends.sequenceId,
        opens: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'open')`.mapWith(Number),
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .groupBy(sends.sequenceId);
    const opensBySequence = new Map(eventRows.map((r) => [r.sequenceId, r.opens]));

    return sequenceRows.map((s) => {
      const enrollment = enrollmentBySequence.get(s.id);
      return {
        ...s,
        stepCount: stepCountBySequence.get(s.id) ?? 0,
        enrolledCount: enrollment?.total ?? 0,
        openCount: opensBySequence.get(s.id) ?? 0,
        // No sequence-wide on/off flag exists (invariant 1 — status lives
        // per enrollment, never a shared sequence clock); "active" here
        // just reflects whether it currently has any active enrollments.
        hasActiveEnrollments: (enrollment?.active ?? 0) > 0,
      };
    });
  }

  async findOne(id: string, db: DbOrTx = this.drizzle.db) {
    const sequence = await db.query.sequences.findFirst({ where: eq(sequences.id, id) });
    if (!sequence) {
      throw new NotFoundException(`Sequence ${id} not found`);
    }
    return sequence;
  }

  async update(id: string, dto: UpdateSequenceDto, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    const [updated] = await db
      .update(sequences)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(sequences.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    await db.delete(sequences).where(eq(sequences.id, id));
    return { id };
  }

  listSteps(sequenceId: string, db: DbOrTx = this.drizzle.db) {
    return db.query.sequenceSteps.findMany({
      where: eq(sequenceSteps.sequenceId, sequenceId),
      orderBy: asc(sequenceSteps.order),
    });
  }

  async addStep(sequenceId: string, dto: CreateStepDto, db: DbOrTx = this.drizzle.db) {
    await this.findOne(sequenceId, db);

    const currentSteps = await db
      .select({ order: sequenceSteps.order })
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId));
    const nextOrder = currentSteps.length > 0 ? Math.max(...currentSteps.map((s) => s.order)) + 1 : 0;

    const [created] = await db
      .insert(sequenceSteps)
      .values({
        sequenceId,
        order: nextOrder,
        type: dto.type,
        templateId: dto.templateId,
        delayValue: dto.delayValue,
        delayUnit: dto.delayUnit,
      })
      .returning();
    return created;
  }

  async updateStep(sequenceId: string, stepId: string, dto: UpdateStepDto, db: DbOrTx = this.drizzle.db) {
    await this.findOne(sequenceId, db);
    const step = await db.query.sequenceSteps.findFirst({ where: eq(sequenceSteps.id, stepId) });
    if (!step || step.sequenceId !== sequenceId) {
      throw new NotFoundException(`Step ${stepId} not found in sequence ${sequenceId}`);
    }

    const [updated] = await db
      .update(sequenceSteps)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(sequenceSteps.id, stepId))
      .returning();
    return updated;
  }

  async removeStep(sequenceId: string, stepId: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(sequenceId, db);
    const step = await db.query.sequenceSteps.findFirst({ where: eq(sequenceSteps.id, stepId) });
    if (!step || step.sequenceId !== sequenceId) {
      throw new NotFoundException(`Step ${stepId} not found in sequence ${sequenceId}`);
    }
    await db.delete(sequenceSteps).where(eq(sequenceSteps.id, stepId));
    return { id: stepId };
  }

  async reorderSteps(sequenceId: string, dto: ReorderStepsDto, db: DbOrTx = this.drizzle.db) {
    await this.findOne(sequenceId, db);
    const existing = await this.listSteps(sequenceId, db);
    const existingIds = new Set(existing.map((s) => s.id));

    if (dto.stepIds.length !== existing.length || !dto.stepIds.every((id) => existingIds.has(id))) {
      throw new BadRequestException('stepIds must be exactly the set of this sequence\'s current step IDs');
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < dto.stepIds.length; i++) {
        await tx
          .update(sequenceSteps)
          .set({ order: i, updatedAt: new Date() })
          .where(eq(sequenceSteps.id, dto.stepIds[i]));
      }
    });

    return this.listSteps(sequenceId, db);
  }

  /** Sequence detail "Stats" tab (GC-139) — per-step enrollment counts,
   * sent today/yesterday/scheduled-tomorrow, and engagement rates. Day
   * boundaries are UTC calendar days (`date_trunc('day', now())`), same
   * convention as `senderAccounts.sentTodayDate` elsewhere in this codebase. */
  async getStats(sequenceId: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(sequenceId, db);

    const steps = await this.listSteps(sequenceId, db);
    const sendSteps = steps.filter((s) => s.type === 'send_email');

    const enrollmentStatusRows = await db
      .select({ status: sequenceEnrollments.status, count: sql<number>`count(*)`.mapWith(Number) })
      .from(sequenceEnrollments)
      .where(eq(sequenceEnrollments.sequenceId, sequenceId))
      .groupBy(sequenceEnrollments.status);
    const enrolledByStatus = Object.fromEntries(enrollmentStatusRows.map((r) => [r.status, r.count]));

    const stepCountRows = await db
      .select({ stepId: sequenceEnrollments.currentStepId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(sequenceEnrollments)
      .where(
        and(
          eq(sequenceEnrollments.sequenceId, sequenceId),
          inArray(sequenceEnrollments.status, ['active', 'paused']),
        ),
      )
      .groupBy(sequenceEnrollments.currentStepId);
    const countByStepId = new Map(stepCountRows.map((r) => [r.stepId, r.count]));

    const stepBreakdown = sendSteps.map((step, i) => ({
      stepId: step.id,
      stepNumber: i + 1,
      templateId: step.templateId,
      contactCount: countByStepId.get(step.id) ?? 0,
    }));

    const [sendCounts] = await db
      .select({
        sentToday: sql<number>`count(*) filter (where ${sends.sentAt} >= date_trunc('day', now()) and ${sends.sentAt} < date_trunc('day', now()) + interval '1 day')`.mapWith(
          Number,
        ),
        sentYesterday: sql<number>`count(*) filter (where ${sends.sentAt} >= date_trunc('day', now()) - interval '1 day' and ${sends.sentAt} < date_trunc('day', now()))`.mapWith(
          Number,
        ),
        totalSent: sql<number>`count(*) filter (where ${sends.status} = 'sent')`.mapWith(Number),
        bounced: sql<number>`count(*) filter (where ${sends.status} = 'bounced')`.mapWith(Number),
        complained: sql<number>`count(*) filter (where ${sends.status} = 'complained')`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${sends.status} = 'failed')`.mapWith(Number),
      })
      .from(sends)
      .where(eq(sends.sequenceId, sequenceId));

    const [scheduledRow] = await db
      .select({
        scheduledTomorrow: sql<number>`count(*) filter (where ${sequenceEnrollments.nextRunAt} >= date_trunc('day', now()) + interval '1 day' and ${sequenceEnrollments.nextRunAt} < date_trunc('day', now()) + interval '2 day')`.mapWith(
          Number,
        ),
      })
      .from(sequenceEnrollments)
      .where(and(eq(sequenceEnrollments.sequenceId, sequenceId), eq(sequenceEnrollments.status, 'active')));

    const [eventRow] = await db
      .select({
        opens: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'open')`.mapWith(Number),
        clicks: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'click')`.mapWith(Number),
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .where(eq(sends.sequenceId, sequenceId));

    const totalSent = sendCounts?.totalSent ?? 0;
    const opens = eventRow?.opens ?? 0;
    const clicks = eventRow?.clicks ?? 0;

    return {
      enrolled: {
        active: enrolledByStatus.active ?? 0,
        paused: enrolledByStatus.paused ?? 0,
        stopped: enrolledByStatus.stopped ?? 0,
        completed: enrolledByStatus.completed ?? 0,
        total: Object.values(enrolledByStatus).reduce((a: number, b) => a + (b as number), 0),
      },
      stepBreakdown,
      sends: {
        sentToday: sendCounts?.sentToday ?? 0,
        sentYesterday: sendCounts?.sentYesterday ?? 0,
        scheduledTomorrow: scheduledRow?.scheduledTomorrow ?? 0,
        totalSent,
        bounced: sendCounts?.bounced ?? 0,
        complained: sendCounts?.complained ?? 0,
        failed: sendCounts?.failed ?? 0,
      },
      engagement: {
        opens,
        clicks,
        openRate: totalSent > 0 ? opens / totalSent : 0,
        clickRate: totalSent > 0 ? clicks / totalSent : 0,
      },
    };
  }
}
