import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { asc, eq, sql } from 'drizzle-orm';
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
      .values({ name: dto.name, description: dto.description, webhookSecret: randomBytes(32).toString('hex') })
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
}
