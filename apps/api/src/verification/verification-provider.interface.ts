export interface VerificationProviderResult {
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  isDeliverable: boolean;
}

/** Reoon and NeverBounce implement this same interface — EmailVerificationService
 * tries VERIFICATION_PROVIDER's pick first, falls back to the other on any failure. */
export interface EmailVerificationProvider {
  verify(email: string): Promise<VerificationProviderResult>;
}
