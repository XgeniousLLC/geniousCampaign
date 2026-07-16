import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VerificationController } from './verification.controller';
import { LocalVerifyService } from './local-verify.service';
import { ReoonProvider } from './reoon.provider';
import { NeverBounceProvider } from './neverbounce.provider';
import { EmailVerificationService } from './email-verification.service';
import { VerificationStatsService } from './verification-stats.service';
import { BulkVerifyProcessor } from './bulk-verify.processor';
import { AuthModule } from '../auth/auth.module';
import { SuppressionModule } from '../suppression/suppression.module';

@Module({
  imports: [AuthModule, SuppressionModule, BullModule.registerQueue({ name: 'bulk-verify' })],
  controllers: [VerificationController],
  providers: [LocalVerifyService, ReoonProvider, NeverBounceProvider, EmailVerificationService, VerificationStatsService, BulkVerifyProcessor],
  exports: [LocalVerifyService, EmailVerificationService],
})
export class VerificationModule {}
