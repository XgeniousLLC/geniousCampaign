import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DebugLogController } from './debug-log.controller';
import { DebugLogService } from './debug-log.service';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DebugLogController],
  providers: [DebugLogService, { provide: APP_FILTER, useClass: AllExceptionsFilter }],
  exports: [DebugLogService],
})
export class DebugLogModule {}
