import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { outboundWebhookSubscriptions } from '../db/schema';
import type { OutboundDeliveryJobData } from './outbound-webhook-dispatch.service';

@Processor('outbound-webhooks')
export class OutboundWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundWebhookProcessor.name);

  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async process(job: Job<OutboundDeliveryJobData>): Promise<void> {
    const { subscriptionId, eventType, payload, timestamp } = job.data;
    const subscription = await this.drizzle.db.query.outboundWebhookSubscriptions.findFirst({
      where: eq(outboundWebhookSubscriptions.id, subscriptionId),
    });
    if (!subscription || !subscription.isActive) return;

    const body = JSON.stringify({ eventType, payload, timestamp });
    const signature = createHmac('sha256', subscription.secret).update(body).digest('hex');

    const res = await fetch(subscription.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Signature': signature, 'X-Event-Type': eventType },
      body,
    });

    if (!res.ok) {
      // Throwing lets BullMQ's configured attempts/backoff retry this job.
      throw new Error(`Outbound webhook delivery to ${subscription.url} failed: ${res.status} ${res.statusText}`);
    }

    this.logger.log(`Delivered ${eventType} to ${subscription.url} (attempt ${job.attemptsMade + 1})`);
  }
}
