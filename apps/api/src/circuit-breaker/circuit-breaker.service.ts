import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { sends, sequenceEnrollments, breakerEvaluations, breakerResets } from '../db/schema';
import { EnrollmentService } from '../enrollments/enrollment.service';

const DEFAULT_WINDOW_SIZE = 500;
const DEFAULT_THRESHOLD_PCT = 5;

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly enrollments: EnrollmentService,
  ) {}

  private windowSize(): number {
    return Number(this.config.get<string>('CIRCUIT_BREAKER_WINDOW_SIZE') ?? DEFAULT_WINDOW_SIZE);
  }

  private thresholdPct(): number {
    return Number(this.config.get<string>('CIRCUIT_BREAKER_THRESHOLD_PCT') ?? DEFAULT_THRESHOLD_PCT);
  }

  /** Current trip state: tripped iff the most recent evaluation tripped it
   * and no reset has happened since — never auto-heals (ticket: "flags for
   * review", a human resets it). */
  async isTripped(): Promise<boolean> {
    const [latestEval] = await this.drizzle.db
      .select()
      .from(breakerEvaluations)
      .orderBy(desc(breakerEvaluations.createdAt))
      .limit(1);
    if (!latestEval || !latestEval.tripped) return false;

    const [latestReset] = await this.drizzle.db.select().from(breakerResets).orderBy(desc(breakerResets.createdAt)).limit(1);
    if (!latestReset) return true;
    return latestReset.createdAt < latestEval.createdAt;
  }

  /** Throws if currently tripped — called from SendDispatcherService so a
   * trip blocks sends in real time, not just at the next evaluation cycle. */
  async assertNotTripped() {
    if (await this.isTripped()) {
      throw new ForbiddenException('Circuit breaker is tripped (elevated bounce/complaint rate) — sends are paused until an owner reviews and resets it.');
    }
  }

  /** Evaluates the rolling window and trips (pausing every active
   * enrollment) if the bounce+complaint rate crosses the threshold. */
  async evaluate(): Promise<{ tripped: boolean; ratePct: number; pausedEnrollmentCount: number }> {
    const windowSize = this.windowSize();
    const thresholdPct = this.thresholdPct();

    const window = await this.drizzle.db
      .select({ status: sends.status })
      .from(sends)
      .orderBy(desc(sends.createdAt))
      .limit(windowSize);

    const totalCount = window.length;
    const bounceOrComplaintCount = window.filter((s) => s.status === 'bounced' || s.status === 'complained').length;
    const ratePct = totalCount > 0 ? (bounceOrComplaintCount / totalCount) * 100 : 0;
    const tripped = totalCount >= 20 && ratePct >= thresholdPct; // don't trip on a tiny/noisy sample

    let pausedEnrollmentCount = 0;
    if (tripped) {
      const alreadyTripped = await this.isTripped();
      if (!alreadyTripped) {
        pausedEnrollmentCount = await this.pauseAllActiveEnrollments();
        this.events.emit('circuit_breaker.tripped', { ratePct, thresholdPct, windowSize, pausedEnrollmentCount });
        this.logger.warn(`Circuit breaker TRIPPED: ${ratePct.toFixed(1)}% bounce/complaint rate over last ${totalCount} sends (threshold ${thresholdPct}%)`);
      }
    }

    await this.drizzle.db.insert(breakerEvaluations).values({
      windowSize,
      bounceOrComplaintCount,
      totalCount,
      ratePct,
      thresholdPct,
      tripped,
      pausedEnrollmentCount,
    });

    return { tripped, ratePct, pausedEnrollmentCount };
  }

  /** Pauses every active enrollment through the one shared EnrollmentService
   * (invariant 2) — never a direct bulk DB update, even from a safety-net
   * feature like this, so a breaker-triggered pause is provably the same
   * state transition as a manual or webhook-triggered one. */
  private async pauseAllActiveEnrollments(): Promise<number> {
    const active = await this.drizzle.db
      .select({ id: sequenceEnrollments.id })
      .from(sequenceEnrollments)
      .where(eq(sequenceEnrollments.status, 'active'));

    let paused = 0;
    for (const enrollment of active) {
      try {
        await this.enrollments.pause(enrollment.id);
        paused++;
      } catch (err) {
        this.logger.error(`Failed to pause enrollment ${enrollment.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
    return paused;
  }

  async reset(userId: string | null, db: DbOrTx = this.drizzle.db) {
    await db.insert(breakerResets).values({ resetByUserId: userId });
  }

  getConfig() {
    return { windowSize: this.windowSize(), thresholdPct: this.thresholdPct() };
  }
}
