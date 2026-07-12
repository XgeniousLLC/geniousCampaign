import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { DrizzleService } from '../db/drizzle.service';
import { senderAccounts } from '../db/schema';
import { decryptToken } from './token-encryption.util';
import { SuppressionService } from '../suppression/suppression.service';

const BOUNCE_QUERY = 'from:mailer-daemon OR subject:"Delivery Status Notification" OR subject:"Undelivered Mail"';

/** Extracts the original recipient's email from a DSN bounce body — Gmail's
 * bounce format varies, so this looks for the common
 * "Final-Recipient: rfc822; user@domain.com" DSN field. */
export function extractBouncedRecipient(body: string): string | null {
  const match = body.match(/Final-Recipient:\s*rfc822;\s*([^\s<>]+@[^\s<>]+)/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * GC-046: 15-minute inbox-poll job per connected Gmail account — Gmail
 * bounce detection is a heuristic (DSN parsing), unlike SES's structured
 * SNS events, so a single Gmail-detected bounce is treated as a soft
 * signal via recordSoftBounce() rather than immediate suppression
 * (CLAUDE.md invariant 9).
 */
@Processor('gmail-bounce-scanner')
export class GmailBounceScannerProcessor extends WorkerHost {
  private readonly logger = new Logger(GmailBounceScannerProcessor.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly suppression: SuppressionService,
  ) {
    super();
  }

  async process(_job: Job): Promise<{ accountsScanned: number; bouncesFound: number }> {
    const clientId = this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI');
    const encryptionSecret = this.config.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!clientId || !clientSecret || !redirectUri || !encryptionSecret) {
      // Not configured yet — nothing to scan, not an error (mirrors every
      // other unconfigured-integration path: skip quietly rather than spam
      // the log every 15 minutes for a feature nobody has connected).
      return { accountsScanned: 0, bouncesFound: 0 };
    }

    const gmailAccounts = await this.drizzle.db.query.senderAccounts.findMany({
      where: eq(senderAccounts.provider, 'gmail'),
    });

    let bouncesFound = 0;
    for (const account of gmailAccounts) {
      if (!account.isActive || !account.gmailRefreshTokenEncrypted) continue;
      try {
        bouncesFound += await this.scanAccount(account, clientId, clientSecret, redirectUri, encryptionSecret);
      } catch (err) {
        this.logger.error(`Bounce scan failed for ${account.email}: ${err instanceof Error ? err.message : err}`);
      }
    }

    return { accountsScanned: gmailAccounts.length, bouncesFound };
  }

  private async scanAccount(
    account: typeof senderAccounts.$inferSelect,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    encryptionSecret: string,
  ): Promise<number> {
    const refreshToken = decryptToken(account.gmailRefreshTokenEncrypted!, encryptionSecret);
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: client });

    const sinceQuery = account.gmailLastBounceScanAt
      ? `${BOUNCE_QUERY} after:${Math.floor(account.gmailLastBounceScanAt.getTime() / 1000)}`
      : BOUNCE_QUERY;

    const list = await gmail.users.messages.list({ userId: 'me', q: sinceQuery, maxResults: 50 });
    const messages = list.data.messages ?? [];

    let bounces = 0;
    for (const msg of messages) {
      if (!msg.id) continue;
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const body = extractPlainTextBody(full.data);
      const bouncedEmail = body ? extractBouncedRecipient(body) : null;
      if (!bouncedEmail) continue;

      await this.suppression.recordSoftBounce(bouncedEmail, `gmail:${account.email}`);
      bounces++;
    }

    await this.drizzle.db
      .update(senderAccounts)
      .set({ gmailLastBounceScanAt: new Date(), updatedAt: new Date() })
      .where(eq(senderAccounts.id, account.id));

    return bounces;
  }
}

function extractPlainTextBody(message: { payload?: { parts?: unknown[]; body?: { data?: string | null } } } | undefined): string | null {
  if (!message?.payload) return null;
  const data = message.payload.body?.data;
  if (data) return Buffer.from(data, 'base64url').toString('utf8');

  const parts = (message.payload.parts ?? []) as { mimeType?: string; body?: { data?: string | null } }[];
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64url').toString('utf8');
    }
  }
  return null;
}
