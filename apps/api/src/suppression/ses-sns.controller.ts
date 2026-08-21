import {
  Controller,
  Get,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SuppressionService } from './suppression.service';
import { DrizzleService } from '../db/drizzle.service';
import { sends, emailEvents } from '../db/schema';
import { WebhookDeliveriesService } from '../webhooks/webhook-deliveries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface SesMailObject {
  messageId?: string;
}

interface SesBounceNotification {
  notificationType: 'Bounce';
  mail?: SesMailObject;
  bounce: {
    bounceType: 'Permanent' | 'Transient' | 'Undetermined';
    bouncedRecipients: { emailAddress: string }[];
  };
}

interface SesComplaintNotification {
  notificationType: 'Complaint';
  mail?: SesMailObject;
  complaint: {
    complainedRecipients: { emailAddress: string }[];
  };
}

interface SesDeliveryNotification {
  notificationType: 'Delivery';
  mail?: SesMailObject;
  delivery: {
    recipients: string[];
    timestamp: string;
    processingTimeMillis: number;
  };
}

type SesNotification =
  | SesBounceNotification
  | SesComplaintNotification
  | SesDeliveryNotification
  | { notificationType: string };

interface SnsEnvelope {
  Type: 'SubscriptionConfirmation' | 'Notification' | 'UnsubscribeConfirmation';
  Message: string;
  SubscribeURL?: string;
}

/**
 * SES configuration set -> SNS topic -> this HTTPS endpoint (SNS's HTTP(S)
 * subscription delivery, used here instead of SQS since no SQS queue can be
 * provisioned without real AWS access — same end result: bounce/complaint
 * notifications feed the suppression list per CLAUDE.md invariant 8).
 */
@Controller('webhooks/ses/sns')
export class SesSnsController {
  private readonly logger = new Logger(SesSnsController.name);

  constructor(
    private readonly suppression: SuppressionService,
    private readonly drizzle: DrizzleService,
    private readonly webhookDeliveries: WebhookDeliveriesService,
    private readonly events: EventEmitter2,
  ) {}

  // Health check for SNS subscription verification — SNS performs an initial
  // GET to confirm the endpoint is reachable before sending notifications.
  @Get()
  getHealthCheck() {
    return { status: 'ok' };
  }

  // Read-only, so Settings > Integrations can show the exact URL to paste
  // into the SNS topic's HTTPS subscription — same req.hostname derivation
  // TrackingDomainController uses for its CNAME target, kept auth-gated
  // (unlike the POST handler below, which SNS itself calls with no auth).
  @Get('webhook-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  getWebhookUrl(@Req() req: Request) {
    return { url: `${req.protocol}://${req.get('host')}/webhooks/ses/sns` };
  }

  @Post()
  async handle(@Req() req: RawBodyRequest<Request>) {
    const rawBody = req.rawBody ?? Buffer.alloc(0);
    const bodyString = rawBody.toString();
    const contentType = req.get('content-type');
    this.logger.debug(`[SNS_RECEIVED] content-type: ${contentType}, length: ${bodyString.length}, first 100 chars: ${bodyString.substring(0, 100)}`);

    let envelope: SnsEnvelope;
    try {
      envelope = JSON.parse(bodyString);
    } catch (err) {
      this.logger.warn(
        `[SNS_PARSE_ERROR] Failed to parse SNS payload: ${err instanceof Error ? err.message : String(err)}. Content-Type: ${contentType}. Body preview: ${bodyString.substring(0, 200)}`,
      );
      await this.webhookDeliveries.log({
        webhookEndpointId: null,
        slug: 'ses-sns',
        signatureValid: true,
        // Store what AWS actually sent, not just the parse error — `payload:
        // null` here was a dead end for debugging, since the Webhooks page
        // showed no way to see the raw bytes that failed to parse.
        payload: { contentType: contentType ?? null, rawBody: bodyString.slice(0, 4000) },
        headers: this.extractHeaders(req),
        error: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
      });
      return { ok: false };
    }

    if (envelope.Type === 'SubscriptionConfirmation' && envelope.SubscribeURL) {
      this.logger.log(`Confirming SNS subscription: ${envelope.SubscribeURL}`);
      await this.webhookDeliveries.log({
        webhookEndpointId: null,
        slug: 'ses-sns-subscription',
        signatureValid: true,
        payload: envelope,
        headers: this.extractHeaders(req),
      });
      await fetch(envelope.SubscribeURL).catch((err) =>
        this.logger.error(
          `Failed to confirm SNS subscription: ${err instanceof Error ? err.message : err}`,
        ),
      );
      return { ok: true };
    }

    if (envelope.Type === 'Notification') {
      try {
        const notification: SesNotification = JSON.parse(envelope.Message);
        await this.webhookDeliveries.log({
          webhookEndpointId: null,
          slug: 'ses-sns',
          signatureValid: true,
          payload: notification,
          headers: this.extractHeaders(req),
        });
        await this.processNotification(notification);
      } catch (error) {
        this.logger.warn(
          `SNS Notification.Message was not valid JSON or processing failed: ${error}`,
        );
        await this.webhookDeliveries.log({
          webhookEndpointId: null,
          slug: 'ses-sns',
          signatureValid: true,
          payload: envelope,
          headers: this.extractHeaders(req),
          error: error instanceof Error ? error.message : String(error),
        });
        return { ok: false };
      }
    }

    return { ok: true };
  }

  private extractHeaders(req: Request): Record<string, unknown> {
    return {
      'content-type': req.get('content-type'),
      'x-amz-sns-message-type': req.get('x-amz-sns-message-type'),
      'x-amz-sns-message-id': req.get('x-amz-sns-message-id'),
      'x-amz-sns-topic-arn': req.get('x-amz-sns-topic-arn'),
      'user-agent': req.get('user-agent'),
    };
  }

  private async processNotification(notification: SesNotification) {
    if (notification.notificationType === 'Bounce') {
      const { bounce, mail } = notification as SesBounceNotification;
      for (const recipient of bounce.bouncedRecipients) {
        if (bounce.bounceType === 'Permanent') {
          await this.suppression.suppress(
            recipient.emailAddress,
            'hard_bounce',
            'ses_sns',
          );
        } else {
          await this.suppression.recordSoftBounce(
            recipient.emailAddress,
            'ses_sns',
          );
        }
      }
      await this.markSendStatusAndCreateEvent(
        mail?.messageId,
        'bounced',
        'bounce',
        bounce.bounceType,
      );
    } else if (notification.notificationType === 'Complaint') {
      const { complaint, mail } = notification as SesComplaintNotification;
      for (const recipient of complaint.complainedRecipients) {
        await this.suppression.suppress(
          recipient.emailAddress,
          'complaint',
          'ses_sns',
        );
      }
      await this.markSendStatusAndCreateEvent(
        mail?.messageId,
        'complained',
        'complaint',
        undefined,
      );
    } else if (notification.notificationType === 'Delivery') {
      const { delivery, mail } = notification as SesDeliveryNotification;
      await this.markSendStatusAndCreateEvent(
        mail?.messageId,
        'delivered',
        'delivery',
        undefined,
      );
    }
  }

  /** Correlates the notification back to the specific `sends` row via providerMessageId,
   * updates sends.status for historical record, creates an email_event record,
   * and emits an event to the internal bus for triggers and outbound webhooks. */
  private async markSendStatusAndCreateEvent(
    messageId: string | undefined,
    status: 'bounced' | 'complained' | 'delivered',
    eventType: 'bounce' | 'complaint' | 'delivery',
    bounceType?: string,
  ) {
    if (!messageId) return;

    const send = await this.drizzle.db.query.sends.findFirst({
      where: eq(sends.providerMessageId, messageId),
    });

    if (!send) {
      this.logger.warn(`No send found for providerMessageId: ${messageId}`);
      return;
    }

    await this.drizzle.db
      .update(sends)
      .set({ status })
      .where(eq(sends.id, send.id));

    const metadata = bounceType ? JSON.stringify({ bounceType }) : undefined;
    await this.drizzle.db.insert(emailEvents).values({
      sendId: send.id,
      type: eventType,
      metadata,
    });

    if (eventType === 'bounce') {
      this.events.emit('email.bounced', {
        sendId: send.id,
        contactId: send.contactId,
        bounceType: bounceType || 'Undetermined',
      });
    } else if (eventType === 'complaint') {
      this.events.emit('email.complained', {
        sendId: send.id,
        contactId: send.contactId,
      });
    } else if (eventType === 'delivery') {
      this.events.emit('email.delivered', {
        sendId: send.id,
        contactId: send.contactId,
      });
    }

    this.logger.log(`Recorded ${eventType} event for send ${send.id}`);
  }
}
