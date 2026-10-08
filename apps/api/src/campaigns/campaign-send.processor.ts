import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CampaignsService, type CampaignRecipientJobData } from './campaigns.service';

type CampaignSendJobData = { campaignId: string } | CampaignRecipientJobData;

/** Thin BullMQ entry point for the `campaign-send` queue — all orchestration
 * lives in `CampaignsService` (fan-out + per-recipient + resume), so the
 * send logic is callable identically from the processor, the boot sweep,
 * and the admin recover endpoint instead of existing in two places.
 *
 * Job names: `fan-out` snapshots the audience and enqueues one `recipient`
 * job per contact; `recipient` sends to exactly one contact, idempotently.
 * The pre-fan-out job name `send` is still accepted as a fan-out for any
 * delayed jobs enqueued before the split. */
@Processor('campaign-send', { concurrency: 5 })
export class CampaignSendProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignSendProcessor.name);

  constructor(private readonly campaignsService: CampaignsService) {
    super();
  }

  async process(job: Job<CampaignSendJobData>) {
    if (job.name === 'recipient') {
      return this.campaignsService.sendRecipient(job.data as CampaignRecipientJobData);
    }
    // 'fan-out' + legacy 'send'.
    return this.campaignsService.fanOutCampaign((job.data as { campaignId: string }).campaignId);
  }
}
