export interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
  messageTags?: Record<string, string>;
  /** Which SenderAccount row to send as — required by GmailSenderProvider
   * (each Gmail mailbox has its own OAuth credentials); ignored by
   * SesSenderProvider (single identity for now, per GC-017). */
  senderAccountId?: string;
}

export interface SendEmailResult {
  provider: 'ses' | 'gmail';
  providerMessageId: string;
}

/**
 * All sending providers (SES, Gmail — CLAUDE.md architectural invariant 7)
 * implement this same interface, dispatched through one SendDispatcherService
 * (GC-045) rather than each caller picking a provider directly.
 */
export interface EmailSenderProvider {
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
