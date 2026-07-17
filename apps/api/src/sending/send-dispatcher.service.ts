import { Injectable } from '@nestjs/common';
import { SenderAccountService } from './sender-account.service';
import { SesSenderProvider } from './ses-sender.provider';
import { GmailSenderProvider } from './gmail-sender.provider';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
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
    private readonly breaker: CircuitBreakerService,
  ) {}

  async send(
    params: Omit<SendEmailParams, 'from' | 'senderAccountId'> & {
      /** GC-125 — a campaign's explicit sender pick; hard-overrides quota
       * rotation, see SenderAccountService.pickAccountForSend(). */
      senderAccountId?: string;
      /** GC-125 — per-campaign From display name; falls back to the picked
       * account's own displayName when unset. */
      fromName?: string;
    },
  ): Promise<SendEmailResult> {
    // GC-050 — blocks in real time, not just at the next 5-minute
    // evaluation cycle.
    await this.breaker.assertNotTripped();

    const { senderAccountId: overrideAccountId, fromName, ...rest } = params;
    const account = await this.senderAccounts.pickAccountForSend(overrideAccountId);
    const provider = account.provider === 'gmail' ? this.gmailSender : this.sesSender;

    const displayName = fromName || account.displayName;
    const from = displayName ? `"${displayName.replace(/"/g, "'")}" <${account.email}>` : account.email;

    const result = await provider.send({ ...rest, from, senderAccountId: account.id });
    await this.senderAccounts.recordSend(account.id);
    return result;
  }
}
