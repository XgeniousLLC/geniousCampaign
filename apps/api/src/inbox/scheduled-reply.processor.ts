import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { scheduledReplies, emailThreads } from '../db/schema';
import { InboxService } from './inbox.service';

export interface ScheduledReplyJob {
  scheduledReplyId: string;
  threadId: string;
}

@Processor('inbox-scheduled-reply')
export class ScheduledReplyProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledReplyProcessor.name);
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly inbox: InboxService,
  ) {
    super();
  }

  async process(job: Job<ScheduledReplyJob>): Promise<{ sent: boolean }> {
    const row = await this.drizzle.db.query.scheduledReplies.findFirst({
      where: eq(scheduledReplies.id, job.data.scheduledReplyId),
    });
    if (!row || row.status !== 'pending') return { sent: false };
    const thread = await this.drizzle.db.query.emailThreads.findFirst({
      where: eq(emailThreads.id, row.threadId),
    });
    if (!thread || thread.isFinished) {
      await this.drizzle.db
        .update(scheduledReplies)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(scheduledReplies.id, row.id));
      return { sent: false };
    }
    try {
      await this.inbox.replyToThread(row.threadId, {
        html: row.html,
        text: row.text,
        cc: row.cc ?? undefined,
        bcc: row.bcc ?? undefined,
      });
      await this.drizzle.db
        .update(scheduledReplies)
        .set({ status: 'sent', updatedAt: new Date() })
        .where(eq(scheduledReplies.id, row.id));
      return { sent: true };
    } catch (err) {
      this.logger.error(
        `scheduled reply ${row.id} failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`scheduled-reply job ${job.id} failed: ${err.message}`);
  }
}
