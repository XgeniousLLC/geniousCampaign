import { Body, Controller, Logger, Post } from '@nestjs/common';
import { SuppressionService } from './suppression.service';

interface SesBounceNotification {
  notificationType: 'Bounce';
  bounce: {
    bounceType: 'Permanent' | 'Transient' | 'Undetermined';
    bouncedRecipients: { emailAddress: string }[];
  };
}

interface SesComplaintNotification {
  notificationType: 'Complaint';
  complaint: {
    complainedRecipients: { emailAddress: string }[];
  };
}

type SesNotification = SesBounceNotification | SesComplaintNotification | { notificationType: string };

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

  constructor(private readonly suppression: SuppressionService) {}

  @Post()
  async handle(@Body() rawBody: string) {
    let envelope: SnsEnvelope;
    try {
      envelope = JSON.parse(rawBody);
    } catch {
      this.logger.warn('Received non-JSON SNS payload, ignoring');
      return { ok: false };
    }

    if (envelope.Type === 'SubscriptionConfirmation' && envelope.SubscribeURL) {
      this.logger.log(`Confirming SNS subscription: ${envelope.SubscribeURL}`);
      await fetch(envelope.SubscribeURL).catch((err) =>
        this.logger.error(`Failed to confirm SNS subscription: ${err instanceof Error ? err.message : err}`),
      );
      return { ok: true };
    }

    if (envelope.Type === 'Notification') {
      const notification: SesNotification = JSON.parse(envelope.Message);
      await this.processNotification(notification);
    }

    return { ok: true };
  }

  private async processNotification(notification: SesNotification) {
    if (notification.notificationType === 'Bounce') {
      const { bounce } = notification as SesBounceNotification;
      for (const recipient of bounce.bouncedRecipients) {
        if (bounce.bounceType === 'Permanent') {
          await this.suppression.suppress(recipient.emailAddress, 'hard_bounce', 'ses_sns');
        } else {
          await this.suppression.recordSoftBounce(recipient.emailAddress, 'ses_sns');
        }
      }
    } else if (notification.notificationType === 'Complaint') {
      const { complaint } = notification as SesComplaintNotification;
      for (const recipient of complaint.complainedRecipients) {
        await this.suppression.suppress(recipient.emailAddress, 'complaint', 'ses_sns');
      }
    }
  }
}
