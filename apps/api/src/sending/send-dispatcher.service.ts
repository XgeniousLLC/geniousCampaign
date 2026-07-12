import { Injectable } from '@nestjs/common';
import { SenderAccountService } from './sender-account.service';
import { SesSenderProvider } from './ses-sender.provider';
import { GmailSenderProvider } from './gmail-sender.provider';
import type { SendEmailParams, SendEmailResult } from './email-sender-provider.interface';

/**
 * The single sending entry point (CLAUDE.md invariant 7) — every caller
 * (sequence runner, campaign send processor) goes through this instead of
 * picking SesSenderProvider/GmailSenderProvider directly. Picks the account
 * with the most quota headroom, dispatches to that provider, and records
 * the send against the account on success only (a failed send shouldn't
 * count against the account's daily quota).
 */
@Injectable()
export class SendDispatcherService {
  constructor(
    private readonly senderAccounts: SenderAccountService,
    private readonly sesSender: SesSenderProvider,
    private readonly gmailSender: GmailSenderProvider,
  ) {}

  async send(params: Omit<SendEmailParams, 'from' | 'senderAccountId'>): Promise<SendEmailResult> {
    const account = await this.senderAccounts.pickAccountForSend();
    const provider = account.provider === 'gmail' ? this.gmailSender : this.sesSender;

    const result = await provider.send({ ...params, from: account.email, senderAccountId: account.id });
    await this.senderAccounts.recordSend(account.id);
    return result;
  }
}
