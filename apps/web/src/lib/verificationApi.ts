import { apiPost } from './api';

export interface LocalVerifyResult {
  valid: boolean;
  reason?: 'invalid_syntax' | 'disposable_domain' | 'no_mx_record';
}

// Free syntax/MX/disposable-domain check only — the paid Reoon/NeverBounce
// step (POST /verification/check) is never called without a real API key
// configured, per CLAUDE.md.
export function localCheckEmail(email: string) {
  return apiPost<LocalVerifyResult>('/verification/local-check', { email });
}
