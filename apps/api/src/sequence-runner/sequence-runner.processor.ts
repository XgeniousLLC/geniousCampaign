import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SequenceRunnerService } from './sequence-runner.service';

@Processor('sequence-runner')
export class SequenceRunnerProcessor extends WorkerHost {
  private readonly logger = new Logger(SequenceRunnerProcessor.name);

  constructor(private readonly runner: SequenceRunnerService) {
    super();
  }

  async process(_job: Job): Promise<{ processed: number }> {
    const result = await this.runner.tick();
    if (result.processed > 0) {
      this.logger.log(`Processed ${result.processed} due enrollment(s)`);
    }
    return result;
  }
}
