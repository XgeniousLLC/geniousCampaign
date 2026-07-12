import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SesSenderProvider } from './ses-sender.provider';
import { GmailSenderProvider } from './gmail-sender.provider';
import { GmailOAuthService } from './gmail-oauth.service';
import { SenderAccountService } from './sender-account.service';
import { SendDispatcherService } from './send-dispatcher.service';
import { SenderAccountsController } from './sender-accounts.controller';
import { GmailBounceScannerProcessor } from './gmail-bounce-scanner.processor';
import { AuthModule } from '../auth/auth.module';
import { SuppressionModule } from '../suppression/suppression.module';

const BOUNCE_SCAN_INTERVAL_MS = 15 * 60_000;

@Module({
  imports: [AuthModule, SuppressionModule, BullModule.registerQueue({ name: 'gmail-bounce-scanner' })],
  controllers: [SenderAccountsController],
  providers: [
    SesSenderProvider,
    GmailSenderProvider,
    GmailOAuthService,
    SenderAccountService,
    SendDispatcherService,
    GmailBounceScannerProcessor,
  ],
  exports: [SesSenderProvider, SendDispatcherService, SenderAccountService],
})
export class SendingModule implements OnModuleInit {
  constructor(@InjectQueue('gmail-bounce-scanner') private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'scan',
      { every: BOUNCE_SCAN_INTERVAL_MS },
      { name: 'scan', opts: { removeOnComplete: true, removeOnFail: 100 } },
    );
  }
}
