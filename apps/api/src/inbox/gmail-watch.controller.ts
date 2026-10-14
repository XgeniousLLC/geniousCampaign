import { Body, Controller, Post } from '@nestjs/common';
import { DrizzleService } from '../db/drizzle.service';
import { InboxService } from './inbox.service';
import { eq, sql } from 'drizzle-orm';
import { senderAccounts } from '../db/schema';
import { Public } from '../auth/public.decorator';

/**
 * T10 — Gmail Pub/Sub push handler. No shared secret: a push is honored only
 * when its `emailAddress` matches a connected, active Gmail sender account
 * (the account's own OAuth refresh token does the Gmail API work). Anything
 * else is ignored. Keep poller as fallback.
 */
@Controller('webhooks/gmail')
export class GmailWatchController {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly inbox: InboxService,
  ) {}

  @Public()
  @Post('push')
  async push(@Body() body: { message?: { data?: string } }) {
    const data = body?.message?.data;
    if (!data) return { ok: true };
    try {
      const payload = JSON.parse(
        Buffer.from(data, 'base64').toString('utf8'),
      ) as {
        emailAddress?: string;
        historyId?: string;
      };
      if (!payload.emailAddress) return { ok: true, ignored: true };
      // Authorize against the existing account connection — unknown,
      // inactive, or disconnected mailboxes never trigger Gmail API work.
      const account = await this.drizzle.db.query.senderAccounts.findFirst({
        where: eq(
          sql`lower(${senderAccounts.email})`,
          payload.emailAddress.toLowerCase(),
        ),
      });
      if (
        !account ||
        !account.isActive ||
        account.provider !== 'gmail' ||
        !account.gmailRefreshTokenEncrypted
      ) {
        return { ok: true, ignored: true };
      }
      await this.inbox.pollAccount(account.id);
      return { ok: true, historyId: payload.historyId };
    } catch {
      return { ok: true };
    }
  }
}
