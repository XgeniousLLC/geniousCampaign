export interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  /** Bulk-mail unsubscribe URL (RFC 8058). Omit for manual 1:1 mail
   * (inbox replies) — providers then skip List-Unsubscribe headers. */
  unsubscribeUrl?: string;
  /** Set false to keep the unsubscribe footer link but drop the
   * List-Unsubscribe / List-Unsubscribe-Post headers. Defaults to true. */
  includeUnsubscribeHeader?: boolean;
  messageTags?: Record<string, string>;
  /** GC-125 — per-campaign reply-to override; when unset, replies go to
   * `from` as normal. */
  replyTo?: string;
  /** Which SenderAccount row to send as — required by GmailSenderProvider
   * (each Gmail mailbox has its own OAuth credentials); ignored by
   * SesSenderProvider (single identity for now, per GC-017). */
  senderAccountId?: string;
  /** Gmail thread to reply in (follow-ups with empty subject reuse it). */
  threadId?: string;
  /** Last Gmail message id in the thread, for In-Reply-To/References. */
  inReplyToMessageId?: string;
  cc?: string;
  bcc?: string;
}

export interface SendEmailResult {
  provider: 'ses' | 'gmail';
  providerMessageId: string;
  providerThreadId?: string;
}

/**
 * All sending providers (SES, Gmail — CLAUDE.md architectural invariant 7)
 * implement this same interface, dispatched through one SendDispatcherService
 * (GC-045) rather than each caller picking a provider directly.
 */
export interface EmailSenderProvider {
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
