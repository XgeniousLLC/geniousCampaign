import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import { senderAccounts } from '../db/schema';
import { decryptToken } from '../sending/token-encryption.util';

/** T10 — users.watch registration + 5-day renewal. Poller stays as fallback. */
@Injectable()
export class GmailWatchService {
  private readonly logger = new Logger(GmailWatchService.name);
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly settings: SettingsService,
  ) {}

  async ensureWatch(accountId: string) {
    const topic = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topic) {
      this.logger.warn('GMAIL_PUBSUB_TOPIC not set — skipping watch');
      return null;
    }
    const account = await this.drizzle.db.query.senderAccounts.findFirst({
      where: eq(senderAccounts.id, accountId),
    });
    if (!account?.gmailRefreshTokenEncrypted) return null;
    const clientId = this.settings.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.settings.get('GOOGLE_OAUTH_CLIENT_SECRET');
    const redirectUri = this.settings.get('GOOGLE_OAUTH_REDIRECT_URI');
    const secret = this.settings.get('TOKEN_ENCRYPTION_KEY');
    if (!clientId || !clientSecret || !redirectUri || !secret) return null;
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    client.setCredentials({
      refresh_token: decryptToken(account.gmailRefreshTokenEncrypted, secret),
    });
    const gmail = google.gmail({ version: 'v1', auth: client });
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: topic,
        labelFilterBehavior: 'INCLUDE',
      },
    });
    return { historyId: res.data.historyId, expiration: res.data.expiration };
  }

  async renewAll() {
    const accounts = await this.drizzle.db.query.senderAccounts.findMany({
      where: eq(senderAccounts.provider, 'gmail'),
    });
    for (const a of accounts) {
      if (!a.isActive) continue;
      try {
        await this.ensureWatch(a.id);
      } catch (err) {
        this.logger.warn(
          `watch renew ${a.email} failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
