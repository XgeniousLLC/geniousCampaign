import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitBreakerProcessor } from './circuit-breaker.processor';
import { CircuitBreakerController } from './circuit-breaker.controller';
import { AuthModule } from '../auth/auth.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

const EVAL_INTERVAL_MS = 5 * 60_000;

@Module({
  imports: [AuthModule, EnrollmentsModule, BullModule.registerQueue({ name: 'circuit-breaker-eval' })],
  controllers: [CircuitBreakerController],
  providers: [CircuitBreakerService, CircuitBreakerProcessor],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule implements OnModuleInit {
  constructor(@InjectQueue('circuit-breaker-eval') private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'evaluate',
      { every: EVAL_INTERVAL_MS },
      { name: 'evaluate', opts: { removeOnComplete: true, removeOnFail: 100 } },
    );
  }
}
