import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailVerificationService } from './email-verification.service';
import { VerificationStatsService } from './verification-stats.service';

export interface BulkVerifyResult {
  totalContacts: number;
  checked: number;
  failed: number;
  // Subset of `failed` that hit a provider rate limit rather than a hard
  // failure (bad key, provider outage) — these self-resolve, so the UI can
  // point the admin at "try again shortly" instead of "go check Settings".
  rateLimited: number;
  lastError?: string;
}

function isRateLimitFailure(err: unknown): boolean {
  return err instanceof Error && /rate.?limit/i.test(err.message);
}

// Invariant 10 — bulk verify is a BullMQ job, never a blocking loop over
// potentially thousands of contacts in the request/response cycle.
@Processor('bulk-verify')
export class BulkVerifyProcessor extends WorkerHost {
  constructor(
    private readonly emailVerification: EmailVerificationService,
    private readonly stats: VerificationStatsService,
  ) {
    super();
  }

  async process(job: Job<{ limit?: number }>): Promise<BulkVerifyResult> {
    const all = await this.stats.listUnverifiedActiveContacts();
    const targets = job.data?.limit ? all.slice(0, job.data.limit) : all;
    const result: BulkVerifyResult = { totalContacts: targets.length, checked: 0, failed: 0, rateLimited: 0 };

    for (let i = 0; i < targets.length; i++) {
      try {
        await this.emailVerification.verify(targets[i].email);
        result.checked++;
      } catch (err) {
        result.failed++;
        if (isRateLimitFailure(err)) result.rateLimited++;
        result.lastError = err instanceof Error ? err.message : String(err);
      }

      if (i % 20 === 0) {
        await job.updateProgress(Math.round(((i + 1) / Math.max(1, targets.length)) * 100));
      }
    }

    await job.updateProgress(100);
    return result;
  }
}
