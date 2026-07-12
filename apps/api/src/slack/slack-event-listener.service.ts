import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SlackNotificationService } from './slack-notification.service';

/**
 * One explicit @OnEvent() handler per event type (not a wildcard listener,
 * invariant 12), each producing a distinct, readable message rather than a
 * generic "something happened" (GC-051's acceptance criterion).
 */
@Injectable()
export class SlackEventListenerService {
  constructor(private readonly slack: SlackNotificationService) {}

  @OnEvent('circuit_breaker.tripped')
  onCircuitBreakerTripped(payload: { ratePct: number; thresholdPct: number; windowSize: number; pausedEnrollmentCount: number }) {
    return this.slack.sendBestEffort(
      `🔴 *Circuit breaker tripped* — bounce/complaint rate hit ${payload.ratePct.toFixed(1)}% over the last ${payload.windowSize} sends (threshold ${payload.thresholdPct}%). Paused ${payload.pausedEnrollmentCount} active sequence enrollment(s). Review and reset in the admin panel before sending resumes.`,
    );
  }

  @OnEvent('campaign.completed')
  onCampaignCompleted(payload: { campaignId: string; name: string; sentCount: number; failedCount: number; suppressedCount: number }) {
    return this.slack.sendBestEffort(
      `✅ *Campaign finished*: "${payload.name}" — ${payload.sentCount} sent, ${payload.failedCount} failed, ${payload.suppressedCount} suppressed.`,
    );
  }

  @OnEvent('campaign.large_send_confirmed')
  onLargeSendConfirmed(payload: { campaignId: string; name: string; recipientCount: number; threshold: number }) {
    return this.slack.sendBestEffort(
      `⚠️ *Large send confirmed*: "${payload.name}" is going out to ${payload.recipientCount} recipients (above the ${payload.threshold}-recipient confirmation threshold).`,
    );
  }
}
