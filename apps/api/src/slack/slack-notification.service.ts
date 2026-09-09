import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);

  constructor(private readonly settings: SettingsService) {}

  async send(text: string) {
    const webhookUrl = this.settings.get('SLACK_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new InternalServerErrorException('SLACK_WEBHOOK_URL is not configured — cannot send a real Slack notification.');
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`Slack webhook returned ${res.status} ${res.statusText}`);
    }
  }

  /** Every listener catches its own failure rather than letting a Slack
   * outage break the event it's reacting to — a notification is
   * best-effort, never load-bearing for the actual feature. Slack is
   * opt-in (unset `SLACK_WEBHOOK_URL` = feature off, the default for
   * every install that hasn't configured it) — that's a normal, silent
   * no-op, not a warning-worthy failure. Only a genuinely configured
   * webhook that then fails to deliver logs anything. */
  async sendBestEffort(text: string) {
    if (!this.settings.get('SLACK_WEBHOOK_URL')) return;
    try {
      await this.send(text);
    } catch (err) {
      this.logger.warn(`Slack notification failed (non-fatal): ${err instanceof Error ? err.message : err}`);
    }
  }
}
