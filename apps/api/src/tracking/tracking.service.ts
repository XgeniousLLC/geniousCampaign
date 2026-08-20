import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import { emailEvents, sends } from '../db/schema';
import { signTrackingToken, verifyTrackingToken } from './tracking-token.util';
import { DebugLogService } from '../debug-log/debug-log.service';

interface OpenPayload {
  sendId: string;
}

interface ClickPayload {
  sendId: string;
  url: string;
}

@Injectable()
export class TrackingService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly events: EventEmitter2,
    private readonly debugLog: DebugLogService,
  ) {}

  private get secret(): string {
    const secret = this.settings.get('TRACKING_SIGNING_SECRET');
    if (!secret) {
      throw new Error('TRACKING_SIGNING_SECRET is not set — cannot sign tracking tokens');
    }
    return secret;
  }

  get baseUrl(): string {
    const domain = this.settings.get('TRACKING_DOMAIN');
    if (domain && domain !== 'track.yourdomain.com') {
      return `https://${domain}`;
    }
    // Local dev fallback — production must set a real TRACKING_DOMAIN.
    return `http://localhost:${this.config.get<string>('PORT') ?? 3000}`;
  }

  buildOpenPixelUrl(sendId: string): string {
    const token = signTrackingToken(this.secret, { sendId } satisfies OpenPayload);
    const url = `${this.baseUrl}/t/o/${token}`;
    const domain = this.settings.get('TRACKING_DOMAIN');
    if (!domain || domain === 'track.yourdomain.com') {
      // eslint-disable-next-line no-console
      console.warn(
        `[TRACKING] TRACKING_DOMAIN not configured; tracking pixels will use fallback ${this.baseUrl} and may be unreachable from email clients`
      );
    }
    return url;
  }

  buildClickUrl(sendId: string, url: string): string {
    const token = signTrackingToken(this.secret, { sendId, url } satisfies ClickPayload);
    return `${this.baseUrl}/t/c/${token}`;
  }

  verifyOpenToken(token: string): OpenPayload | null {
    try {
      const payload = verifyTrackingToken<OpenPayload>(this.secret, token);
      if (!payload) {
        const tokenPreview = token.substring(0, 20);
        this.debugLog.record({
          source: 'backend',
          message: `[TRACKING_VERIFY] Token verification returned null for token: ${tokenPreview}...`,
          context: { tokenPreview },
        });
      }
      return payload;
    } catch (err) {
      this.debugLog.record({
        source: 'backend',
        message: `[TRACKING_VERIFY_ERROR] Exception during token verification`,
        stack: err instanceof Error ? err.stack : String(err),
        context: { error: err instanceof Error ? err.message : String(err) },
      });
      return null;
    }
  }

  verifyClickToken(token: string): ClickPayload | null {
    return verifyTrackingToken<ClickPayload>(this.secret, token);
  }

  async recordOpen(sendId: string) {
    const send = await this.drizzle.db.query.sends.findFirst({ where: eq(sends.id, sendId) });
    if (!send) {
      await this.debugLog.record({
        source: 'backend',
        message: `[TRACKING_ERROR] Send not found for sendId: ${sendId}`,
        context: { sendId, error: 'Send record not found' },
      });
      return;
    }
    try {
      await this.drizzle.db.insert(emailEvents).values({ sendId, type: 'open' });
      await this.debugLog.record({
        source: 'backend',
        message: `[TRACKING_SUCCESS] Open event inserted for sendId: ${sendId}, contactId: ${send.contactId}`,
        context: { sendId, contactId: send.contactId },
      });
      this.events.emit('email.opened', { sendId, contactId: send.contactId });
    } catch (err) {
      await this.debugLog.record({
        source: 'backend',
        message: `[TRACKING_ERROR] Failed to record open event for sendId: ${sendId}`,
        stack: err instanceof Error ? err.stack : String(err),
        context: { sendId, error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  async recordClick(sendId: string, url: string) {
    const send = await this.drizzle.db.query.sends.findFirst({ where: eq(sends.id, sendId) });
    if (!send) return;
    await this.drizzle.db.insert(emailEvents).values({ sendId, type: 'click', url });
    this.events.emit('email.clicked', { sendId, contactId: send.contactId, url });
  }
}
