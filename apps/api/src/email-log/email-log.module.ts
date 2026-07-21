import { Module } from '@nestjs/common';
import { EmailLogController } from './email-log.controller';
import { EmailLogService } from './email-log.service';
import { AuthModule } from '../auth/auth.module';
import { SendingModule } from '../sending/sending.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [AuthModule, SendingModule, TrackingModule],
  controllers: [EmailLogController],
  providers: [EmailLogService],
})
export class EmailLogModule {}
