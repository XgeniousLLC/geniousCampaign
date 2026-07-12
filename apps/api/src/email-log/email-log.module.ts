import { Module } from '@nestjs/common';
import { EmailLogController } from './email-log.controller';
import { EmailLogService } from './email-log.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EmailLogController],
  providers: [EmailLogService],
})
export class EmailLogModule {}
