import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import * as nodemailer from 'nodemailer';
import type SESTransport from 'nodemailer/lib/ses-transport';
import type { EmailSenderProvider, SendEmailParams, SendEmailResult } from './email-sender-provider.interface';

@Injectable()
export class SesSenderProvider implements EmailSenderProvider {
  private readonly logger = new Logger(SesSenderProvider.name);
  private readonly transporter: nodemailer.Transporter<SESTransport.SentMessageInfo, SESTransport.Options> | null;
  private readonly configurationSet?: string;

  constructor(private readonly config: ConfigService) {
    const region = config.get<string>('AWS_REGION');
    this.configurationSet = config.get<string>('SES_CONFIGURATION_SET') || undefined;

    if (!region) {
      // No AWS region configured — this provider is wired but cannot send
      // for real until credentials are provided. Never fake a successful
      // send in this state (CLAUDE.md).
      this.transporter = null;
      return;
    }

    const sesClient = new SESv2Client({ region });
    this.transporter = nodemailer.createTransport({
      SES: { sesClient, SendEmailCommand },
    });
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.transporter) {
      throw new InternalServerErrorException(
        'SES is not configured (AWS_REGION missing) — cannot send for real. Set AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/SES_CONFIGURATION_SET/SES_FROM_EMAIL in .env.',
      );
    }

    try {
      const info = await this.transporter.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        headers: {
          'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        ses: {
          ConfigurationSetName: this.configurationSet,
          EmailTags: params.messageTags
            ? Object.entries(params.messageTags).map(([Name, Value]) => ({ Name, Value }))
            : undefined,
        },
      });

      return { provider: 'ses', providerMessageId: info.messageId };
    } catch (err) {
      this.logger.error(`SES send failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }
}
