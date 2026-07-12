import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
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
  ) {}

  private get secret(): string {
    const secret = this.config.get<string>('TRACKING_SIGNING_SECRET');
    if (!secret) {
      throw new Error('TRACKING_SIGNING_SECRET is not set — cannot sign tracking tokens');
    }
    return secret;
  }

  private get baseUrl(): string {
    const domain = this.config.get<string>('TRACKING_DOMAIN');
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
  }

  async recordClick(sendId: string, url: string) {
    const send = await this.drizzle.db.query.sends.findFirst({ where: eq(sends.id, sendId) });
    if (!send) return;
    await this.drizzle.db.insert(emailEvents).values({ sendId, type: 'click', url });
  }
}
