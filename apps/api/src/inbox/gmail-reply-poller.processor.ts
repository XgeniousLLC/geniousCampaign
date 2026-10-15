import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { senderAccounts } from '../db/schema';
import { InboxService } from './inbox.service';

@Processor('gmail-reply-poll')
export class GmailReplyPollerProcessor extends WorkerHost {
  private readonly logger = new Logger(GmailReplyPollerProcessor.name);
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly inbox: InboxService,
  ) {
    super();
  }

  async process(): Promise<{ polled: number; ingested: number }> {
    const accounts = await this.drizzle.db.query.senderAccounts.findMany({
      where: eq(senderAccounts.provider, 'gmail'),
    });
    let ingested = 0;
    for (const a of accounts) {
      if (!a.isActive || !a.gmailRefreshTokenEncrypted) continue;
      try {
        ingested += await this.inbox.pollAccount(a.id);
      } catch (err) {
        this.logger.warn(
          `poll ${a.email} failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return { polled: accounts.length, ingested };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`reply-poll job ${job.id} failed: ${err.message}`);
  }
}
