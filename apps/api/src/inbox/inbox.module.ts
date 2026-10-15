import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';
import { GmailReplyPollerProcessor } from './gmail-reply-poller.processor';
import { GmailWatchController } from './gmail-watch.controller';
import { GmailWatchService } from './gmail-watch.service';
import {
  InboxEventsListener,
  SubsequenceService,
} from './inbox-events.listener';
import { SubsequenceEnrollProcessor } from './subsequence-enroll.processor';
import { ScheduledReplyProcessor } from './scheduled-reply.processor';
import { AuthModule } from '../auth/auth.module';
import { SendingModule } from '../sending/sending.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { SuppressionModule } from '../suppression/suppression.module';
import { AiAssistModule } from '../ai-assist/ai-assist.module';

const REPLY_POLL_MS = 3 * 60_000;
const WATCH_RENEW_MS = 5 * 24 * 60 * 60_000;

@Module({
  imports: [
    AuthModule,
    SendingModule,
    EnrollmentsModule,
    SuppressionModule,
    AiAssistModule,
    BullModule.registerQueue({ name: 'gmail-reply-poll' }),
    BullModule.registerQueue({ name: 'subsequence-enroll' }),
    BullModule.registerQueue({ name: 'inbox-scheduled-reply' }),
  ],
  controllers: [InboxController, GmailWatchController],
  providers: [
    InboxService,
    GmailReplyPollerProcessor,
    GmailWatchService,
    InboxEventsListener,
    SubsequenceService,
    SubsequenceEnrollProcessor,
    ScheduledReplyProcessor,
  ],
  exports: [InboxService, SubsequenceService],
})
export class InboxModule implements OnModuleInit {
  constructor(
    @InjectQueue('gmail-reply-poll') private readonly queue: Queue,
    private readonly watch: GmailWatchService,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'poll',
      { every: REPLY_POLL_MS },
      { name: 'poll', opts: { removeOnComplete: true, removeOnFail: 50 } },
    );
    // Best-effort watch renewal; poller covers failures.
    setInterval(() => {
      this.watch.renewAll().catch(() => undefined);
    }, WATCH_RENEW_MS).unref?.();
  }
}
