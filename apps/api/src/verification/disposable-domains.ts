// A curated (not exhaustive) list of well-known disposable/temp-email domains.
// Extend as needed — this is a local, zero-cost first line of defense before
// any paid verification API call (GC-049).
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'fakeinbox.com',
  'sharklasers.com',
  'dispostable.com',
  'mintemail.com',
  'mailnesia.com',
  'spamgourmet.com',
  'mytemp.email',
  'moakt.com',
]);

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}
