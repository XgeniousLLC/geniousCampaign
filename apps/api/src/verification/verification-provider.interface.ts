export interface VerificationProviderResult {
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  isDeliverable: boolean;
}

/** Reoon and NeverBounce implement this same interface — EmailVerificationService
 * tries VERIFICATION_PROVIDER's pick first, falls back to the other on any failure. */
export interface EmailVerificationProvider {
  verify(email: string): Promise<VerificationProviderResult>;
}

/** Thrown by a provider on HTTP 429 / a rate-limit response body — a
 * distinct error type from "misconfigured" or "the API is down" so
 * EmailVerificationService can retry with backoff instead of immediately
 * failing over or giving up. retryAfterMs comes from a Retry-After header
 * when the provider sends one. */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/** Retry-After is seconds per RFC 9110 in practice for both Reoon/NeverBounce
 * (neither sends the HTTP-date form) — undefined lets the caller fall back
 * to its own default backoff. */
export function parseRetryAfterMs(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}
