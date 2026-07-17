import { Body, Controller, Get, Logger, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { SuppressionService } from './suppression.service';
import { DrizzleService } from '../db/drizzle.service';
import { sends } from '../db/schema';
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

  constructor(
    private readonly suppression: SuppressionService,
    private readonly drizzle: DrizzleService,
  ) {}

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
      const { bounce, mail } = notification as SesBounceNotification;
      for (const recipient of bounce.bouncedRecipients) {
        if (bounce.bounceType === 'Permanent') {
          await this.suppression.suppress(recipient.emailAddress, 'hard_bounce', 'ses_sns');
        } else {
          await this.suppression.recordSoftBounce(recipient.emailAddress, 'ses_sns');
        }
      }
      await this.markSendStatus(mail?.messageId, 'bounced');
    } else if (notification.notificationType === 'Complaint') {
      const { complaint, mail } = notification as SesComplaintNotification;
      for (const recipient of complaint.complainedRecipients) {
        await this.suppression.suppress(recipient.emailAddress, 'complaint', 'ses_sns');
      }
      await this.markSendStatus(mail?.messageId, 'complained');
    }
  }

  /** Correlates the notification back to the specific `sends` row via
   * providerMessageId, so sends.status becomes an accurate historical
   * record (not just the suppression list) — this is what GC-050's
   * circuit breaker reads its rolling bounce rate from. */
  private async markSendStatus(messageId: string | undefined, status: 'bounced' | 'complained') {
    if (!messageId) return;
    await this.drizzle.db.update(sends).set({ status }).where(eq(sends.providerMessageId, messageId));
  }
}
