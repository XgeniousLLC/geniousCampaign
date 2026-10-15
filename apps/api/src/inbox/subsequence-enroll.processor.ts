import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { EnrollmentService } from '../enrollments/enrollment.service';

export interface SubsequenceEnrollJob {
  threadId: string;
  ruleId: string;
  childSequenceId: string;
  contactId: string;
}

@Processor('subsequence-enroll')
export class SubsequenceEnrollProcessor extends WorkerHost {
  private readonly logger = new Logger(SubsequenceEnrollProcessor.name);
  constructor(
    private readonly enrollments: EnrollmentService,
    private readonly events: EventEmitter2,
  ) {
    super();
  }

  async process(
    job: Job<SubsequenceEnrollJob>,
  ): Promise<{ enrolled: boolean }> {
    const { threadId, ruleId, childSequenceId, contactId } = job.data;
    try {
      await this.enrollments.enroll(childSequenceId, contactId, undefined, {
        via: 'auto',
      });
      this.events.emit('subsequence.routed', {
        threadId,
        ruleId,
        childSequenceId,
      });
      return { enrolled: true };
    } catch (err) {
      // 409 (already enrolled / trigger-once / caps) is a benign skip —
      // first match wins, same rule as the schedule-time check.
      this.events.emit('subsequence.skipped', {
        threadId,
        ruleId,
        reason: err instanceof Error ? err.message : String(err),
      });
      this.logger.log(
        `subsequence enroll skipped (thread ${threadId}, rule ${ruleId}): ${err instanceof Error ? err.message : err}`,
      );
      return { enrolled: false };
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `subsequence-enroll job ${job.id} failed: ${err.message}`,
    );
  }
}
