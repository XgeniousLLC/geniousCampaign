import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CircuitBreakerService } from './circuit-breaker.service';

@Processor('circuit-breaker-eval')
export class CircuitBreakerProcessor extends WorkerHost {
  constructor(private readonly breaker: CircuitBreakerService) {
    super();
  }

  async process(_job: Job) {
    return this.breaker.evaluate();
  }
}
