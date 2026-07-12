import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SequenceRunnerService } from './sequence-runner.service';
import { SequenceRunnerProcessor } from './sequence-runner.processor';
import { SendingModule } from '../sending/sending.module';
import { SuppressionModule } from '../suppression/suppression.module';
import { TrackingModule } from '../tracking/tracking.module';

const TICK_INTERVAL_MS = 10_000;

@Module({
  imports: [BullModule.registerQueue({ name: 'sequence-runner' }), SendingModule, SuppressionModule, TrackingModule],
  providers: [SequenceRunnerService, SequenceRunnerProcessor],
  exports: [SequenceRunnerService],
})
export class SequenceRunnerModule implements OnModuleInit {
  constructor(@InjectQueue('sequence-runner') private readonly queue: Queue) {}

  async onModuleInit() {
    // A single repeatable job drives every enrollment's tick — no per-enrollment
    // setTimeout/cron (CLAUDE.md invariant 10).
    await this.queue.upsertJobScheduler(
      'tick',
      { every: TICK_INTERVAL_MS },
      { name: 'tick', opts: { removeOnComplete: true, removeOnFail: 100 } },
    );
  }
}
