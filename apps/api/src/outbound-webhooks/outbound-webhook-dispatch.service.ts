import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OutboundWebhookSubscriptionsService } from './outbound-webhook-subscriptions.service';

export interface OutboundDeliveryJobData {
  subscriptionId: string;
  eventType: string;
  payload: unknown;
  timestamp: string;
}

@Injectable()
export class OutboundWebhookDispatchService {
  private readonly logger = new Logger(OutboundWebhookDispatchService.name);

  constructor(
    @InjectQueue('outbound-webhooks') private readonly queue: Queue<OutboundDeliveryJobData>,
    private readonly subscriptions: OutboundWebhookSubscriptionsService,
  ) {}

  /** Fan out an internal event to every active subscription registered for
   * it, each as its own retryable BullMQ job (CLAUDE.md invariant 10). */
  async emit(eventType: string, payload: unknown) {
    const subs = await this.subscriptions.findActiveForEvent(eventType);
    if (subs.length === 0) return;

    const timestamp = new Date().toISOString();
    await Promise.all(
      subs.map((sub) =>
        this.queue.add(
          'deliver',
          { subscriptionId: sub.id, eventType, payload, timestamp },
          { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true, removeOnFail: 50 },
        ),
      ),
    );
    this.logger.log(`Queued ${eventType} for ${subs.length} subscription(s)`);
  }
}
