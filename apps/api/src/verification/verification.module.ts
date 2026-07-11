import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { LocalVerifyService } from './local-verify.service';

@Module({
  controllers: [VerificationController],
  providers: [LocalVerifyService],
  exports: [LocalVerifyService],
})
export class VerificationModule {}
