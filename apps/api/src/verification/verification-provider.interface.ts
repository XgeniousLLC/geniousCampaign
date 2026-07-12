export interface VerificationProviderResult {
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  isDeliverable: boolean;
}

/** Reoon and NeverBounce implement this same interface — GC-049 tries
 * Reoon first (cheaper), falls back to NeverBounce on any failure. */
export interface EmailVerificationProvider {
  verify(email: string): Promise<VerificationProviderResult>;
}
