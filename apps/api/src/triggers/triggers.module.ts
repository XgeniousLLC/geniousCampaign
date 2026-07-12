import { Module } from '@nestjs/common';
import { TriggersController } from './triggers.controller';
import { TriggersService } from './triggers.service';
import { TriggerEvaluationService } from './trigger-evaluation.service';
import { AuthModule } from '../auth/auth.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [AuthModule, EnrollmentsModule],
  controllers: [TriggersController],
  providers: [TriggersService, TriggerEvaluationService],
  exports: [TriggersService],
})
export class TriggersModule {}
