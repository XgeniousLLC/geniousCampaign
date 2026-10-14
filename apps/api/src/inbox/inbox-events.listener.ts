import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import type { ConditionTree } from '@genius-campaign/shared';
import { DrizzleService } from '../db/drizzle.service';
import {
  sequenceEnrollments,
  sequenceSettings,
  sequences,
  subsequences,
  sends,
  emailThreads,
} from '../db/schema';
import { InboxService } from './inbox.service';

@Injectable()
export class InboxEventsListener {
  private readonly logger = new Logger(InboxEventsListener.name);
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly inbox: InboxService,
  ) {}

  /** T07 — stop parent follow-ups on human reply (OOO only snoozes). */
  @OnEvent('inbox.received')
  async onReceived(payload: {
    threadId: string;
    status: string;
    enrollmentId: string | null;
  }) {
    try {
      if (!payload.enrollmentId) return;
      const enrollment =
        await this.drizzle.db.query.sequenceEnrollments.findFirst({
          where: eq(sequenceEnrollments.id, payload.enrollmentId),
        });
      if (!enrollment || enrollment.status !== 'active') return;
      const settings = await this.drizzle.db.query.sequenceSettings.findFirst({
        where: eq(sequenceSettings.sequenceId, enrollment.sequenceId),
      });
      if (payload.status === 'out_of_office') {
        // Snooze 7 days instead of stopping.
        await this.drizzle.db
          .update(sequenceEnrollments)
          .set({
            nextRunAt: new Date(Date.now() + 7 * 86400000),
            updatedAt: new Date(),
          })
          .where(eq(sequenceEnrollments.id, enrollment.id));
        return;
      }
      if (settings?.stopOnReply !== false) {
        await this.drizzle.db
          .update(sequenceEnrollments)
          .set({
            status: 'stopped',
            currentStepId: null,
            nextRunAt: null,
            updatedAt: new Date(),
          })
          .where(eq(sequenceEnrollments.id, enrollment.id));
      }
      // T08 — route into subsequence child.
      await this.inbox.evaluateSubsequence(payload.threadId, { kind: 'reply' });
    } catch (err) {
      this.logger.warn(
        `inbox.received handler failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  @OnEvent('email.opened')
  async onOpened(payload: { sendId: string }) {
    await this.routeEngagement(payload.sendId, 'open');
  }

  @OnEvent('email.clicked')
  async onClicked(payload: { sendId: string }) {
    await this.routeEngagement(payload.sendId, 'click');
  }

  private async routeEngagement(sendId: string, kind: string) {
    const send = await this.drizzle.db.query.sends.findFirst({
      where: eq(sends.id, sendId),
    });
    if (!send?.providerThreadId) return;
    const thread = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.providerThreadId, send.providerThreadId),
    });
    if (thread) await this.inbox.evaluateSubsequence(thread.id, { kind });
  }
}

@Injectable()
export class SubsequenceService {
  constructor(private readonly drizzle: DrizzleService) {}

  async list(parentSequenceId: string) {
    const rules = await this.drizzle.db.query.subsequences.findMany({
      where: eq(subsequences.parentSequenceId, parentSequenceId),
    });
    if (rules.length === 0) return [];
    return Promise.all(
      rules.map(async (rule) => {
        const child = await this.drizzle.db.query.sequences.findFirst({
          where: eq(sequences.id, rule.childSequenceId),
        });
        const settings = await this.drizzle.db.query.sequenceSettings.findFirst({
          where: eq(sequenceSettings.sequenceId, rule.childSequenceId),
        });
        return {
          ...rule,
          childName: child?.name ?? 'Untitled sequence',
          scheduleId: settings?.scheduleId ?? null,
        };
      }),
    );
  }

  /**
   * Create a subsequence: auto-create its child sequence (which owns the steps
   * and is edited with the normal sequence builder), seed the branch schedule,
   * then insert the routing rule. Settings/senders are inherited live from the
   * parent by the runner, so they are not copied here.
   */
  async create(
    parentSequenceId: string,
    dto: {
      name: string;
      conditions: ConditionTree;
      delayMs?: string;
      stopParent?: boolean;
      scheduleId?: string | null;
    },
  ) {
    const parent = await this.drizzle.db.query.sequences.findFirst({
      where: eq(sequences.id, parentSequenceId),
    });
    if (!parent) throw new BadRequestException('Parent sequence not found');
    if (!dto.conditions || dto.conditions.children?.length === 0) {
      throw new BadRequestException('Add at least one condition');
    }

    return this.drizzle.db.transaction(async (tx) => {
      const [child] = await tx
        .insert(sequences)
        .values({
          name: dto.name,
          parentSequenceId,
          senderAccountId: parent.senderAccountId,
          fromName: parent.fromName,
          replyTo: parent.replyTo,
          webhookSecret: randomBytes(32).toString('hex'),
        })
        .returning();
      await tx
        .insert(sequenceSettings)
        .values({ sequenceId: child.id, scheduleId: dto.scheduleId ?? null })
        .onConflictDoNothing();
      const [rule] = await tx
        .insert(subsequences)
        .values({
          parentSequenceId,
          name: dto.name,
          conditions: dto.conditions,
          childSequenceId: child.id,
          delayMs: dto.delayMs ?? '0',
          stopParent: dto.stopParent ?? true,
        })
        .returning();
      return { ...rule, childName: child.name, scheduleId: dto.scheduleId ?? null };
    });
  }

  async update(
    id: string,
    dto: {
      name?: string;
      conditions?: ConditionTree;
      delayMs?: string;
      stopParent?: boolean;
      scheduleId?: string | null;
    },
  ) {
    const rule = await this.drizzle.db.query.subsequences.findFirst({
      where: eq(subsequences.id, id),
    });
    if (!rule) throw new NotFoundException('Subsequence not found');

    return this.drizzle.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(subsequences)
        .set({
          name: dto.name ?? rule.name,
          conditions: dto.conditions ?? rule.conditions,
          delayMs: dto.delayMs ?? rule.delayMs,
          stopParent: dto.stopParent ?? rule.stopParent,
          updatedAt: new Date(),
        })
        .where(eq(subsequences.id, id))
        .returning();
      if (dto.name && dto.name !== rule.name) {
        await tx
          .update(sequences)
          .set({ name: dto.name, updatedAt: new Date() })
          .where(eq(sequences.id, rule.childSequenceId));
      }
      if (dto.scheduleId !== undefined) {
        await tx
          .update(sequenceSettings)
          .set({ scheduleId: dto.scheduleId, updatedAt: new Date() })
          .where(eq(sequenceSettings.sequenceId, rule.childSequenceId));
      }
      return updated;
    });
  }

  async remove(id: string) {
    const rule = await this.drizzle.db.query.subsequences.findFirst({
      where: eq(subsequences.id, id),
    });
    if (rule) {
      // The child sequence owns the steps; deleting it cascades the rule.
      await this.drizzle.db
        .delete(sequences)
        .where(eq(sequences.id, rule.childSequenceId));
    }
    return { id };
  }
}
