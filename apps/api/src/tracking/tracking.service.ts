import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
export class TrackingService implements OnModuleInit {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly events: EventEmitter2,
    private readonly debugLog: DebugLogService,
  ) {}

  // Fail loud once at boot, not silently-and-repeatedly per email. Root
  // cause of a real production incident (2026-09-09): the only prior
  // signal was a console.warn buried in per-send server logs — invisible
  // unless someone thought to grep for it, and it never distinguished
  // "genuinely unconfigured" from "configured but pointing at localhost"
  // (e.g. a stray `http://localhost:3000` value saved by mistake, or an
  // env var change applied to the wrong Coolify resource/not yet
  // redeployed). A misconfiguration here silently breaks every open
  // pixel, click link, AND the List-Unsubscribe header in every email
  // sent until someone happens to inspect a raw email's source — this
  // surfaces it immediately, in both the server logs and the in-app
  // Debug Log page (Settings > Debug Log), the moment the process boots.
  onModuleInit() {
    if (this.config.get<string>('NODE_ENV') !== 'production') return;
    const configured = this.config.get<string>('VITE_API_BASE_URL');
    const looksLocal = !configured || /localhost|127\.0\.0\.1/i.test(configured);
    if (!looksLocal) return;

    const message = configured
      ? `VITE_API_BASE_URL is set to "${configured}" in production — that looks like a local/loopback address, not a public URL. Every tracking pixel, click link, and unsubscribe link in every email sent will be unreachable from real mail clients/recipients.`
      : `VITE_API_BASE_URL is not set in production. Every tracking pixel, click link, and unsubscribe link in every email sent will fall back to ${this.baseUrl}, unreachable from real mail clients/recipients.`;
    this.logger.error(`[TRACKING_MISCONFIGURED] ${message} Set it as a RUNTIME env var on the API resource itself (not just the web/frontend resource) and restart.`);
    void this.debugLog.record({ source: 'backend', message: `[TRACKING_MISCONFIGURED] ${message}` });
  }

  private get secret(): string {
    const secret = this.settings.get('TRACKING_SIGNING_SECRET');
    if (!secret) {
      throw new Error(
        'TRACKING_SIGNING_SECRET is not set — cannot sign tracking tokens',
      );
    }
    return secret;
  }

  // Fully internal, zero-setup: always the API's own public URL
  // (VITE_API_BASE_URL) — already-mandatory config, since the frontend
  // can't reach the API without it, so this is always correctly set in
  // production with no admin action. No custom/dedicated tracking domain
  // concept exists anymore (removed 2026-09-08 — see CLAUDE.md invariant
  // 15) — one less moving part that could silently be misconfigured.
  get baseUrl(): string {
    const apiBaseUrl = this.config.get<string>('VITE_API_BASE_URL');
    if (apiBaseUrl) {
      return apiBaseUrl.replace(/\/+$/, '');
    }
    // Only a fully bare checkout (no .env at all) reaches this.
    return `http://localhost:${this.config.get<string>('PORT') ?? 3000}`;
  }

  // Misconfiguration is reported once at boot (onModuleInit above), not
  // per-pixel here — a large campaign would otherwise spam the same
  // warning hundreds/thousands of times for a single root cause.
  buildOpenPixelUrl(sendId: string): string {
    const token = signTrackingToken(this.secret, {
      sendId,
    } satisfies OpenPayload);
    return `${this.baseUrl}/t/o/${token}`;
  }

  buildClickUrl(sendId: string, url: string): string {
    const token = signTrackingToken(this.secret, {
      sendId,
      url,
    } satisfies ClickPayload);
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
    const send = await this.drizzle.db.query.sends.findFirst({
      where: eq(sends.id, sendId),
    });
    if (!send) {
      await this.debugLog.record({
        source: 'backend',
        message: `[TRACKING_ERROR] Send not found for sendId: ${sendId}`,
        context: { sendId, error: 'Send record not found' },
      });
      return;
    }
    try {
      await this.drizzle.db
        .insert(emailEvents)
        .values({ sendId, type: 'open' });
      this.events.emit('email.opened', { sendId, contactId: send.contactId });
    } catch (err) {
      await this.debugLog.record({
        source: 'backend',
        message: `[TRACKING_ERROR] Failed to record open event for sendId: ${sendId}`,
        stack: err instanceof Error ? err.stack : String(err),
        context: {
          sendId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  async recordClick(sendId: string, url: string) {
    const send = await this.drizzle.db.query.sends.findFirst({
      where: eq(sends.id, sendId),
    });
    if (!send) return;
    await this.drizzle.db
      .insert(emailEvents)
      .values({ sendId, type: 'click', url });
    this.events.emit('email.clicked', {
      sendId,
      contactId: send.contactId,
      url,
    });
  }
}
