import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { DrizzleService } from '../db/drizzle.service';
import { senderAccounts } from '../db/schema';
import { decryptToken } from './token-encryption.util';
import { gmailAuthClient, gmailTokenSecret } from './gmail-client.util';
import type {
  EmailSenderProvider,
  SendEmailParams,
  SendEmailResult,
} from './email-sender-provider.interface';

function buildRawMessage(params: SendEmailParams): string {
  const isTextOnly = params.text && !params.html;
  const boundary = `gc-boundary-${Date.now()}`;
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    ...(params.cc ? [`Cc: ${params.cc}`] : []),
    ...(params.bcc ? [`Bcc: ${params.bcc}`] : []),
    ...(params.replyTo ? [`Reply-To: ${params.replyTo}`] : []),
    ...(params.inReplyToMessageId
      ? [`In-Reply-To: ${params.inReplyToMessageId}`]
      : []),
    ...(params.inReplyToMessageId
      ? [`References: ${params.inReplyToMessageId}`]
      : []),
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    ...(isTextOnly
      ? [
          'Content-Type: text/plain; charset="UTF-8"',
          'Content-Transfer-Encoding: 7bit',
        ]
      : [`Content-Type: multipart/alternative; boundary="${boundary}"`]),
    ...(params.unsubscribeUrl && params.includeUnsubscribeHeader !== false
      ? [
          `List-Unsubscribe: <${params.unsubscribeUrl}>`,
          'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
        ]
      : []),
  ].join('\r\n');

  if (isTextOnly) {
    return Buffer.from(`${headers}\r\n\r\n${params.text}`).toString(
      'base64url',
    );
  }

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    params.text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    params.html,
    `--${boundary}--`,
  ].join('\r\n');

  return Buffer.from(`${headers}\r\n\r\n${body}`).toString('base64url');
}

@Injectable()
export class GmailSenderProvider implements EmailSenderProvider {
  private readonly logger = new Logger(GmailSenderProvider.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly settings: SettingsService,
  ) {}

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!params.senderAccountId) {
      throw new InternalServerErrorException(
        'GmailSenderProvider.send() requires senderAccountId — which mailbox to send as.',
      );
    }

    const encryptionSecret = gmailTokenSecret(this.settings);
    if (!encryptionSecret) {
      throw new InternalServerErrorException(
        'No encryption key available (set TOKEN_ENCRYPTION_KEY or JWT_SECRET) — cannot decrypt Gmail tokens.',
      );
    }

    const account = await this.drizzle.db.query.senderAccounts.findFirst({
      where: eq(senderAccounts.id, params.senderAccountId),
    });
    if (
      !account ||
      account.provider !== 'gmail' ||
      !account.gmailRefreshTokenEncrypted
    ) {
      throw new InternalServerErrorException(
        `Sender account ${params.senderAccountId} is not a connected Gmail account.`,
      );
    }

    try {
      const refreshToken = decryptToken(
        account.gmailRefreshTokenEncrypted,
        encryptionSecret,
      );
      // Per-mailbox OAuth app when set, else the shared Settings app.
      const client = gmailAuthClient(
        account,
        this.settings,
        encryptionSecret,
        refreshToken,
      );

      const gmail = google.gmail({ version: 'v1', auth: client });
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: buildRawMessage(params),
          ...(params.threadId ? { threadId: params.threadId } : {}),
        },
      });

      if (!res.data.id)
        throw new Error('Gmail API did not return a message id');
      return {
        provider: 'gmail',
        providerMessageId: res.data.id,
        providerThreadId: res.data.threadId ?? params.threadId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Gmail send failed for account ${account.email}: ${message}`,
      );
      // A 404 here almost always means the supplied threadId belongs to a
      // different Gmail mailbox than this sender account — the thread does
      // not exist from `me`'s point of view.
      if (params.threadId && /not found/i.test(message)) {
        throw new InternalServerErrorException(
          `Gmail send failed from ${account.email}: this thread belongs to a different mailbox. Reconnect ${account.email} or reply from the mailbox that received the email.`,
        );
      }
      throw new InternalServerErrorException(`Gmail send failed: ${message}`);
    }
  }
}
