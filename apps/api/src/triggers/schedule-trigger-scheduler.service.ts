import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { triggers } from '../db/schema';

/**
 * Keeps one BullMQ repeatable job per active schedule-type trigger, keyed by
 * the trigger's own id — GC-036's "every Monday 9am" recurring evaluation.
 * Uses BullMQ's native cron+tz repeatable-job support rather than a custom
 * cron matcher/setTimeout loop (CLAUDE.md invariant 10).
 */
@Injectable()
export class ScheduleTriggerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ScheduleTriggerSchedulerService.name);

  constructor(
    @InjectQueue('schedule-triggers') private readonly queue: Queue,
    private readonly drizzle: DrizzleService,
  ) {}

  /** Re-register every active schedule trigger's job on boot — jobs don't
   * survive a schema/trigger-table change and repeatable jobs aren't
   * persisted across a full Redis flush, so this makes restarts self-healing. */
  async onModuleInit() {
    const active = await this.drizzle.db.query.triggers.findMany({
      where: and(eq(triggers.eventType, 'schedule'), eq(triggers.isActive, true)),
    });
    for (const trigger of active) {
      await this.syncJob(trigger);
    }
  }

  async syncJob(trigger: typeof triggers.$inferSelect) {
    if (trigger.eventType !== 'schedule' || !trigger.isActive) {
      await this.removeJob(trigger.id);
      return;
    }
    if (!trigger.scheduleCron) {
      this.logger.warn(`Schedule trigger ${trigger.id} has no scheduleCron set — skipping job registration`);
      return;
    }
    await this.queue.upsertJobScheduler(
      trigger.id,
      { pattern: trigger.scheduleCron, tz: trigger.scheduleTimezone ?? 'UTC' },
      { name: 'evaluate', data: { triggerId: trigger.id }, opts: { removeOnComplete: true, removeOnFail: 100 } },
    );
  }

  async removeJob(triggerId: string) {
    await this.queue.removeJobScheduler(triggerId);
  }
}
