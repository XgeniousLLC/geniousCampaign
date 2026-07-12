import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { LocalVerifyService } from './local-verify.service';
import { ReoonProvider } from './reoon.provider';
import { NeverBounceProvider } from './neverbounce.provider';
import { EmailVerificationService } from './email-verification.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VerificationController],
  providers: [LocalVerifyService, ReoonProvider, NeverBounceProvider, EmailVerificationService],
  exports: [LocalVerifyService, EmailVerificationService],
})
export class VerificationModule {}
