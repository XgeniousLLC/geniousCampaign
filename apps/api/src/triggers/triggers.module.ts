import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TriggersController } from './triggers.controller';
import { TriggersService } from './triggers.service';
import { TriggerEvaluationService } from './trigger-evaluation.service';
import { ScheduleTriggerSchedulerService } from './schedule-trigger-scheduler.service';
import { ScheduleTriggerProcessor } from './schedule-trigger.processor';
import { AuthModule } from '../auth/auth.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [AuthModule, EnrollmentsModule, BullModule.registerQueue({ name: 'schedule-triggers' })],
  controllers: [TriggersController],
  providers: [TriggersService, TriggerEvaluationService, ScheduleTriggerSchedulerService, ScheduleTriggerProcessor],
  exports: [TriggersService],
})
export class TriggersModule {}
