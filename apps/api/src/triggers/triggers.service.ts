import { Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { triggers, triggerEvaluations, contacts } from '../db/schema';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';
import { ScheduleTriggerSchedulerService } from './schedule-trigger-scheduler.service';

@Injectable()
export class TriggersService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly scheduler: ScheduleTriggerSchedulerService,
  ) {}

  async create(dto: CreateTriggerDto) {
    const [created] = await this.drizzle.db
      .insert(triggers)
      .values({
        name: dto.name,
        eventType: dto.eventType,
        conditions: dto.conditions,
        sequenceId: dto.sequenceId,
        isActive: dto.isActive ?? true,
        scheduleCron: dto.scheduleCron,
        scheduleTimezone: dto.scheduleTimezone,
        webhookEndpointId: dto.webhookEndpointId,
      })
      .returning();
    if (created.eventType === 'schedule') {
      await this.scheduler.syncJob(created);
    }
    return created;
  }

  /** Trigger list screen (design: "{{ t.fires }} fired" badge) needs a real
   * count — computed from trigger_evaluations, not stored, same aggregation
   * style as templates/campaigns/sequences elsewhere. */
  async findAll() {
    const triggerRows = await this.drizzle.db.query.triggers.findMany({ orderBy: (t, { desc: d }) => d(t.createdAt) });

    const fireRows = await this.drizzle.db
      .select({ triggerId: triggerEvaluations.triggerId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(triggerEvaluations)
      .groupBy(triggerEvaluations.triggerId);
    const firesByTrigger = new Map(fireRows.map((r) => [r.triggerId, r.count]));

    return triggerRows.map((t) => ({ ...t, firedCount: firesByTrigger.get(t.id) ?? 0 }));
  }

  async findOne(id: string) {
    const trigger = await this.drizzle.db.query.triggers.findFirst({ where: eq(triggers.id, id) });
    if (!trigger) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }
    return trigger;
  }

  findActiveForEvent(eventType: string) {
    return this.drizzle.db.query.triggers.findMany({
      where: (t, { and }) => and(eq(t.eventType, eventType), eq(t.isActive, true)),
    });
  }

  /** Webhook triggers (GC-076) are scoped to one specific endpoint, unlike
   * every other event type where any active trigger for that eventType is
   * a candidate — a webhook payload should only fire triggers actually
   * configured against the endpoint it arrived on. */
  findActiveWebhookTriggers(webhookEndpointId: string) {
    return this.drizzle.db.query.triggers.findMany({
      where: (t, { and }) => and(eq(t.eventType, 'webhook'), eq(t.webhookEndpointId, webhookEndpointId), eq(t.isActive, true)),
    });
  }

  async update(id: string, dto: UpdateTriggerDto) {
    const existing = await this.findOne(id);
    const [updated] = await this.drizzle.db
      .update(triggers)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(triggers.id, id))
      .returning();
    if (existing.eventType === 'schedule' || updated.eventType === 'schedule') {
      await this.scheduler.syncJob(updated);
    }
    return updated;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.drizzle.db.delete(triggers).where(eq(triggers.id, id));
    if (existing.eventType === 'schedule') {
      await this.scheduler.removeJob(id);
    }
    return { id };
  }

  async getStats(id: string) {
    await this.findOne(id);
    const [row] = await this.drizzle.db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        enrolled: sql<number>`count(*) filter (where ${triggerEvaluations.enrolled})`.mapWith(Number),
        lastFiredAt: sql<string | null>`max(${triggerEvaluations.createdAt})`,
      })
      .from(triggerEvaluations)
      .where(eq(triggerEvaluations.triggerId, id));

    const total = row?.total ?? 0;
    const enrolled = row?.enrolled ?? 0;
    return {
      totalFires: total,
      enrolledCount: enrolled,
      skippedCount: total - enrolled,
      lastFiredAt: row?.lastFiredAt ?? null,
    };
  }

  async listEvaluations(id: string, limit = 50) {
    await this.findOne(id);
    return this.drizzle.db
      .select({
        id: triggerEvaluations.id,
        contactId: triggerEvaluations.contactId,
        contactEmail: contacts.email,
        eventType: triggerEvaluations.eventType,
        enrolled: triggerEvaluations.enrolled,
        error: triggerEvaluations.error,
        createdAt: triggerEvaluations.createdAt,
      })
      .from(triggerEvaluations)
      .innerJoin(contacts, eq(contacts.id, triggerEvaluations.contactId))
      .where(eq(triggerEvaluations.triggerId, id))
      .orderBy(desc(triggerEvaluations.createdAt))
      .limit(limit);
  }
}
