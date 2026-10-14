import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import {
  sequenceEnrollments,
  sequenceSettings,
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

  list(parentSequenceId: string) {
    return this.drizzle.db.query.subsequences.findMany({
      where: eq(subsequences.parentSequenceId, parentSequenceId),
    });
  }

  async create(
    parentSequenceId: string,
    dto: {
      name: string;
      trigger: 'reply' | 'positive' | 'open' | 'click' | 'ooo' | 'custom_text';
      matchText?: string;
      childSequenceId: string;
      delayMs?: string;
      stopParent?: boolean;
    },
  ) {
    const [created] = await this.drizzle.db
      .insert(subsequences)
      .values({
        parentSequenceId,
        name: dto.name,
        trigger: dto.trigger,
        matchText: dto.matchText,
        childSequenceId: dto.childSequenceId,
        delayMs: dto.delayMs ?? '0',
        stopParent: dto.stopParent ?? true,
      })
      .returning();
    return created;
  }

  async remove(id: string) {
    await this.drizzle.db.delete(subsequences).where(eq(subsequences.id, id));
    return { id };
  }
}
