import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import * as nodemailer from 'nodemailer';
import type SESTransport from 'nodemailer/lib/ses-transport';
import { SettingsService } from '../settings/settings.service';
import { DrizzleService } from '../db/drizzle.service';
import { senderAccounts } from '../db/schema';
import { decryptToken, appEncryptionSecret } from './token-encryption.util';
import type { EmailSenderProvider, SendEmailParams, SendEmailResult } from './email-sender-provider.interface';

@Injectable()
export class SesSenderProvider implements EmailSenderProvider {
  private readonly logger = new Logger(SesSenderProvider.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
  ) {}

  // Built fresh per send (not cached at construction) so AWS credentials
  // saved via Settings > Integrations — or a specific sender account's own
  // credentials (GC-077, multiple AWS accounts) — take effect immediately,
  // no restart. Per-account fields win when present; otherwise falls back
  // to the single global Settings > Integrations AWS_* values, same
  // DB-overrides-env pattern used everywhere else in this app.
  private async buildTransporter(
    senderAccountId?: string,
  ): Promise<{ transporter: nodemailer.Transporter<SESTransport.SentMessageInfo, SESTransport.Options>; configurationSet?: string } | null> {
    let region = this.settings.get('AWS_REGION');
    let configurationSet = this.settings.get('SES_CONFIGURATION_SET') || undefined;
    let accessKeyId: string | undefined;
    let secretAccessKey: string | undefined;

    if (senderAccountId) {
      const account = await this.drizzle.db.query.senderAccounts.findFirst({ where: eq(senderAccounts.id, senderAccountId) });
      if (account?.awsRegion) region = account.awsRegion;
      if (account?.sesConfigurationSet) configurationSet = account.sesConfigurationSet;
      if (account?.awsAccessKeyId) accessKeyId = account.awsAccessKeyId;
      if (account?.awsSecretAccessKeyEncrypted) {
        secretAccessKey = decryptToken(account.awsSecretAccessKeyEncrypted, appEncryptionSecret(this.config));
      }
    }

    if (!region) {
      // No AWS region configured — this provider is wired but cannot send
      // for real until credentials are provided. Never fake a successful
      // send in this state (CLAUDE.md).
      return null;
    }

    const sesClient = new SESv2Client({
      region,
      // Omitted entirely (not passed as undefined fields) when no
      // per-account key pair is set, so the SDK falls through to its
      // default credential provider chain (process.env / IAM role) exactly
      // as before this per-account support existed.
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    const transporter = nodemailer.createTransport({ SES: { sesClient, SendEmailCommand } });
    return { transporter, configurationSet };
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const config = await this.buildTransporter(params.senderAccountId);
    if (!config) {
      throw new InternalServerErrorException(
        'SES is not configured (AWS_REGION missing) — cannot send for real. Set it up in Settings > Integrations or on the sender account itself, or AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/SES_CONFIGURATION_SET/SES_FROM_EMAIL in .env.',
      );
    }

    try {
      const info = await config.transporter.sendMail({
        from: params.from,
        to: params.to,
        replyTo: params.replyTo,
        subject: params.subject,
        html: params.html,
        text: params.text,
        headers: {
          'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        ses: {
          ConfigurationSetName: config.configurationSet,
          EmailTags: params.messageTags
            ? Object.entries(params.messageTags).map(([Name, Value]) => ({ Name, Value }))
            : undefined,
        },
      });

      return { provider: 'ses', providerMessageId: info.messageId };
    } catch (err) {
      this.logger.error(`SES send failed: ${err instanceof Error ? err.message : err}`);
      throw new InternalServerErrorException(
        `SES send failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
