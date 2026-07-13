import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import { emailEvents, sends } from '../db/schema';
import { signTrackingToken, verifyTrackingToken } from './tracking-token.util';

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
    return `${this.baseUrl}/t/o/${token}`;
  }

  buildClickUrl(sendId: string, url: string): string {
    const token = signTrackingToken(this.secret, { sendId, url } satisfies ClickPayload);
    return `${this.baseUrl}/t/c/${token}`;
  }

  verifyOpenToken(token: string): OpenPayload | null {
    return verifyTrackingToken<OpenPayload>(this.secret, token);
  }

  verifyClickToken(token: string): ClickPayload | null {
    return verifyTrackingToken<ClickPayload>(this.secret, token);
  }

  async recordOpen(sendId: string) {
    const send = await this.drizzle.db.query.sends.findFirst({ where: eq(sends.id, sendId) });
    if (!send) return;
    await this.drizzle.db.insert(emailEvents).values({ sendId, type: 'open' });
    this.events.emit('email.opened', { sendId, contactId: send.contactId });
  }

  async recordClick(sendId: string, url: string) {
    const send = await this.drizzle.db.query.sends.findFirst({ where: eq(sends.id, sendId) });
    if (!send) return;
    await this.drizzle.db.insert(emailEvents).values({ sendId, type: 'click', url });
    this.events.emit('email.clicked', { sendId, contactId: send.contactId, url });
  }
}
