import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import {
  sequences,
  sequenceSteps,
  sequenceStepTemplates,
  sequenceSenders,
  sequenceEnrollments,
  sequenceSettings,
  sendingSchedules,
  emailThreads,
  sends,
  emailEvents,
} from '../db/schema';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';

@Injectable()
export class SequencesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateSequenceDto, db: DbOrTx = this.drizzle.db) {
    const { senderAccountIds, ...row } = dto;
    const [created] = await db
      .insert(sequences)
      .values({
        name: row.name,
        description: row.description,
        senderAccountId: row.senderAccountId,
        fromName: row.fromName,
        replyTo: row.replyTo,
        webhookSecret: randomBytes(32).toString('hex'),
      })
      .returning();
    // T01 — every sequence gets a default settings row (1-1).
    await db
      .insert(sequenceSettings)
      .values({ sequenceId: created.id })
      .onConflictDoNothing();
    await this.syncSenders(created.id, senderAccountIds, db);
    return { ...created, senderAccountIds: senderAccountIds ?? [] };
  }

  /** Replace the multi-sender set. Undefined = leave untouched; [] = clear
   * back to legacy single/auto. Never re-pins running enrollments. */
  async syncSenders(
    sequenceId: string,
    senderAccountIds: string[] | undefined,
    db: DbOrTx = this.drizzle.db,
  ) {
    if (senderAccountIds === undefined) return;
    await db
      .delete(sequenceSenders)
      .where(eq(sequenceSenders.sequenceId, sequenceId));
    const unique = [...new Set(senderAccountIds)];
    if (unique.length > 0) {
      await db
        .insert(sequenceSenders)
        .values(
          unique.map((senderAccountId) => ({ sequenceId, senderAccountId })),
        );
    }
  }

  async listSenderIds(
    sequenceId: string,
    db: DbOrTx = this.drizzle.db,
  ): Promise<string[]> {
    const rows = await db.query.sequenceSenders.findMany({
      where: eq(sequenceSenders.sequenceId, sequenceId),
    });
    return rows.map((r) => r.senderAccountId);
  }

  /** Sequences list screen (design: Steps/Enrolled/Open/Status columns)
   * needs real numbers, not placeholders — computed the same aggregation
   * style already used for templates/campaigns, not stored on the row. */
  async findAll() {
    const sequenceRows = await this.drizzle.db.query.sequences.findMany({
      orderBy: (s, { desc }) => desc(s.createdAt),
    });

    const stepCountRows = await this.drizzle.db
      .select({
        sequenceId: sequenceSteps.sequenceId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(sequenceSteps)
      .groupBy(sequenceSteps.sequenceId);
    const stepCountBySequence = new Map(
      stepCountRows.map((r) => [r.sequenceId, r.count]),
    );

    const enrollmentRows = await this.drizzle.db
      .select({
        sequenceId: sequenceEnrollments.sequenceId,
        total: sql<number>`count(*)`.mapWith(Number),
        active:
          sql<number>`count(*) filter (where ${sequenceEnrollments.status} = 'active')`.mapWith(
            Number,
          ),
      })
      .from(sequenceEnrollments)
      .groupBy(sequenceEnrollments.sequenceId);
    const enrollmentBySequence = new Map(
      enrollmentRows.map((r) => [r.sequenceId, r]),
    );

    const eventRows = await this.drizzle.db
      .select({
        sequenceId: sends.sequenceId,
        opens:
          sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'open')`.mapWith(
            Number,
          ),
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .groupBy(sends.sequenceId);
    const opensBySequence = new Map(
      eventRows.map((r) => [r.sequenceId, r.opens]),
    );

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
    const sequence = await db.query.sequences.findFirst({
      where: eq(sequences.id, id),
    });
    if (!sequence) {
      throw new NotFoundException(`Sequence ${id} not found`);
    }
    return { ...sequence, senderAccountIds: await this.listSenderIds(id, db) };
  }

  async update(
    id: string,
    dto: UpdateSequenceDto,
    db: DbOrTx = this.drizzle.db,
  ) {
    await this.findOne(id, db);
    const { senderAccountIds, ...row } = dto;
    const [updated] = await db
      .update(sequences)
      .set({ ...row, updatedAt: new Date() })
      .where(eq(sequences.id, id))
      .returning();
    await this.syncSenders(id, senderAccountIds, db);
    return {
      ...updated,
      senderAccountIds: senderAccountIds ?? (await this.listSenderIds(id, db)),
    };
  }

  async remove(id: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    await db.delete(sequences).where(eq(sequences.id, id));
    return { id };
  }

  /** Attaches each step's linked template ids (sequenceStepTemplates is a
   * many-to-many join — a send_email step can have several templates
   * linked as A/B variants, picked from at random at send time). */
  private async attachTemplateIds<T extends { id: string }>(
    steps: T[],
    db: DbOrTx,
  ): Promise<(T & { templateIds: string[] })[]> {
    if (steps.length === 0) return [];
    const links = await db
      .select({
        stepId: sequenceStepTemplates.sequenceStepId,
        templateId: sequenceStepTemplates.templateId,
      })
      .from(sequenceStepTemplates)
      .where(
        inArray(
          sequenceStepTemplates.sequenceStepId,
          steps.map((s) => s.id),
        ),
      );
    const byStep = new Map<string, string[]>();
    for (const link of links) {
      const arr = byStep.get(link.stepId) ?? [];
      arr.push(link.templateId);
      byStep.set(link.stepId, arr);
    }
    return steps.map((s) => ({ ...s, templateIds: byStep.get(s.id) ?? [] }));
  }

  async listSteps(sequenceId: string, db: DbOrTx = this.drizzle.db) {
    const steps = await db.query.sequenceSteps.findMany({
      where: eq(sequenceSteps.sequenceId, sequenceId),
      orderBy: asc(sequenceSteps.order),
    });
    return this.attachTemplateIds(steps, db);
  }

  async addStep(
    sequenceId: string,
    dto: CreateStepDto,
    db: DbOrTx = this.drizzle.db,
  ) {
    await this.findOne(sequenceId, db);

    const currentSteps = await db
      .select({ order: sequenceSteps.order })
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId));
    const nextOrder =
      currentSteps.length > 0
        ? Math.max(...currentSteps.map((s) => s.order)) + 1
        : 0;

    const [created] = await db
      .insert(sequenceSteps)
      .values({
        sequenceId,
        order: nextOrder,
        type: dto.type,
        delayValue: dto.delayValue,
        delayUnit: dto.delayUnit,
        threadedReply: dto.threadedReply ?? false,
      })
      .returning();

    const templateIds = dto.templateIds ?? [];
    if (templateIds.length > 0) {
      await db.insert(sequenceStepTemplates).values(
        templateIds.map((templateId) => ({
          sequenceStepId: created.id,
          templateId,
        })),
      );
    }
    return { ...created, templateIds };
  }

  async updateStep(
    sequenceId: string,
    stepId: string,
    dto: UpdateStepDto,
    db: DbOrTx = this.drizzle.db,
  ) {
    await this.findOne(sequenceId, db);
    const step = await db.query.sequenceSteps.findFirst({
      where: eq(sequenceSteps.id, stepId),
    });
    if (!step || step.sequenceId !== sequenceId) {
      throw new NotFoundException(
        `Step ${stepId} not found in sequence ${sequenceId}`,
      );
    }

    const { templateIds, ...rest } = dto;
    const [updated] = await db
      .update(sequenceSteps)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(sequenceSteps.id, stepId))
      .returning();

    if (templateIds !== undefined) {
      await db
        .delete(sequenceStepTemplates)
        .where(eq(sequenceStepTemplates.sequenceStepId, stepId));
      if (templateIds.length > 0) {
        await db.insert(sequenceStepTemplates).values(
          templateIds.map((templateId) => ({
            sequenceStepId: stepId,
            templateId,
          })),
        );
      }
    }

    const [{ templateIds: finalTemplateIds }] = await this.attachTemplateIds(
      [updated],
      db,
    );
    return { ...updated, templateIds: finalTemplateIds };
  }

  async removeStep(
    sequenceId: string,
    stepId: string,
    db: DbOrTx = this.drizzle.db,
  ) {
    await this.findOne(sequenceId, db);
    const step = await db.query.sequenceSteps.findFirst({
      where: eq(sequenceSteps.id, stepId),
    });
    if (!step || step.sequenceId !== sequenceId) {
      throw new NotFoundException(
        `Step ${stepId} not found in sequence ${sequenceId}`,
      );
    }
    await db.delete(sequenceSteps).where(eq(sequenceSteps.id, stepId));
    return { id: stepId };
  }

  async reorderSteps(
    sequenceId: string,
    dto: ReorderStepsDto,
    db: DbOrTx = this.drizzle.db,
  ) {
    await this.findOne(sequenceId, db);
    const existing = await this.listSteps(sequenceId, db);
    const existingIds = new Set(existing.map((s) => s.id));

    if (
      dto.stepIds.length !== existing.length ||
      !dto.stepIds.every((id) => existingIds.has(id))
    ) {
      throw new BadRequestException(
        "stepIds must be exactly the set of this sequence's current step IDs",
      );
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
      .select({
        status: sequenceEnrollments.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(sequenceEnrollments)
      .where(eq(sequenceEnrollments.sequenceId, sequenceId))
      .groupBy(sequenceEnrollments.status);
    const enrolledByStatus = Object.fromEntries(
      enrollmentStatusRows.map((r) => [r.status, r.count]),
    );

    const stepCountRows = await db
      .select({
        stepId: sequenceEnrollments.currentStepId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(sequenceEnrollments)
      .where(
        and(
          eq(sequenceEnrollments.sequenceId, sequenceId),
          inArray(sequenceEnrollments.status, ['active', 'paused']),
        ),
      )
      .groupBy(sequenceEnrollments.currentStepId);
    const countByStepId = new Map(
      stepCountRows.map((r) => [r.stepId, r.count]),
    );

    const stepBreakdown = sendSteps.map((step, i) => ({
      stepId: step.id,
      stepNumber: i + 1,
      templateIds: step.templateIds,
      contactCount: countByStepId.get(step.id) ?? 0,
    }));

    const [sendCounts] = await db
      .select({
        sentToday:
          sql<number>`count(*) filter (where ${sends.sentAt} >= date_trunc('day', now()) and ${sends.sentAt} < date_trunc('day', now()) + interval '1 day')`.mapWith(
            Number,
          ),
        sentYesterday:
          sql<number>`count(*) filter (where ${sends.sentAt} >= date_trunc('day', now()) - interval '1 day' and ${sends.sentAt} < date_trunc('day', now()))`.mapWith(
            Number,
          ),
        totalSent:
          sql<number>`count(*) filter (where ${sends.status} = 'sent')`.mapWith(
            Number,
          ),
        bounced:
          sql<number>`count(*) filter (where ${sends.status} = 'bounced')`.mapWith(
            Number,
          ),
        complained:
          sql<number>`count(*) filter (where ${sends.status} = 'complained')`.mapWith(
            Number,
          ),
        failed:
          sql<number>`count(*) filter (where ${sends.status} = 'failed')`.mapWith(
            Number,
          ),
      })
      .from(sends)
      .where(eq(sends.sequenceId, sequenceId));

    const [scheduledRow] = await db
      .select({
        scheduledTomorrow:
          sql<number>`count(*) filter (where ${sequenceEnrollments.nextRunAt} >= date_trunc('day', now()) + interval '1 day' and ${sequenceEnrollments.nextRunAt} < date_trunc('day', now()) + interval '2 day')`.mapWith(
            Number,
          ),
      })
      .from(sequenceEnrollments)
      .where(
        and(
          eq(sequenceEnrollments.sequenceId, sequenceId),
          eq(sequenceEnrollments.status, 'active'),
        ),
      );

    const [eventRow] = await db
      .select({
        opens:
          sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'open')`.mapWith(
            Number,
          ),
        clicks:
          sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'click')`.mapWith(
            Number,
          ),
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .where(eq(sends.sequenceId, sequenceId));

    const totalSent = sendCounts?.totalSent ?? 0;
    const opens = eventRow?.opens ?? 0;
    const clicks = eventRow?.clicks ?? 0;

    // T09 — revenue pipeline = dealValue × interested/positive threads.
    const settings = await db.query.sequenceSettings.findFirst({
      where: eq(sequenceSettings.sequenceId, sequenceId),
    });
    const dealValue = settings?.dealValue ?? 0;
    const positiveThreads = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(emailThreads)
      .where(
        and(
          eq(emailThreads.sequenceId, sequenceId),
          inArray(emailThreads.status, ['interested', 'meeting_booked']),
        ),
      );
    const positiveCount = positiveThreads[0]?.count ?? 0;

    return {
      enrolled: {
        active: enrolledByStatus.active ?? 0,
        paused: enrolledByStatus.paused ?? 0,
        stopped: enrolledByStatus.stopped ?? 0,
        completed: enrolledByStatus.completed ?? 0,
        total: Object.values(enrolledByStatus).reduce(
          (a: number, b) => a + b,
          0,
        ),
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
      pipeline: {
        dealValue,
        positiveThreads: positiveCount,
        total: dealValue * positiveCount,
      },
    };
  }

  // ── T01: sequence settings + schedules ──────────────────────────
  async getSettings(sequenceId: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(sequenceId, db);
    let row = await db.query.sequenceSettings.findFirst({
      where: eq(sequenceSettings.sequenceId, sequenceId),
    });
    if (!row) {
      const [created] = await db
        .insert(sequenceSettings)
        .values({ sequenceId })
        .returning();
      row = created;
    }
    return row;
  }

  async updateSettings(
    sequenceId: string,
    dto: Record<string, unknown> & { cc?: string; bcc?: string },
    db: DbOrTx = this.drizzle.db,
  ) {
    await this.findOne(sequenceId, db);
    if (dto.cc) this.assertEmailList(String(dto.cc));
    if (dto.bcc) this.assertEmailList(String(dto.bcc));
    const [updated] = await db
      .insert(sequenceSettings)
      .values({ sequenceId, ...(dto as object) })
      .onConflictDoUpdate({
        target: sequenceSettings.sequenceId,
        set: { ...(dto as object), updatedAt: new Date() },
      })
      .returning();
    return updated;
  }

  private assertEmailList(raw: string) {
    if (!raw.trim()) return;
    const emails = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (emails.length > 5)
      throw new BadRequestException('Cc/Bcc supports max 5 addresses');
    for (const e of emails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
        throw new BadRequestException(`Invalid email: ${e}`);
    }
  }

  async listSchedules(db: DbOrTx = this.drizzle.db) {
    return db.query.sendingSchedules.findMany();
  }

  async createSchedule(
    dto: {
      name: string;
      timezone?: string;
      days?: boolean[];
      startMin?: number;
      endMin?: number;
    },
    db: DbOrTx = this.drizzle.db,
  ) {
    if (
      dto.startMin !== undefined &&
      dto.endMin !== undefined &&
      dto.startMin >= dto.endMin
    ) {
      throw new BadRequestException('startMin must be < endMin');
    }
    const [created] = await db
      .insert(sendingSchedules)
      .values({
        name: dto.name,
        timezone: dto.timezone ?? 'UTC',
        days: dto.days ?? [true, true, true, true, true, false, false],
        startMin: dto.startMin ?? 540,
        endMin: dto.endMin ?? 1020,
      })
      .returning();
    return created;
  }

  async updateSchedule(
    id: string,
    dto: {
      name?: string;
      timezone?: string;
      days?: boolean[];
      startMin?: number;
      endMin?: number;
    },
    db: DbOrTx = this.drizzle.db,
  ) {
    const existing = await db.query.sendingSchedules.findFirst({
      where: eq(sendingSchedules.id, id),
    });
    if (!existing) throw new NotFoundException('Sending schedule not found');
    const startMin = dto.startMin ?? existing.startMin;
    const endMin = dto.endMin ?? existing.endMin;
    if (startMin >= endMin) {
      throw new BadRequestException('startMin must be < endMin');
    }
    const [updated] = await db
      .update(sendingSchedules)
      .set({ ...(dto as object), updatedAt: new Date() })
      .where(eq(sendingSchedules.id, id))
      .returning();
    return updated;
  }
}
