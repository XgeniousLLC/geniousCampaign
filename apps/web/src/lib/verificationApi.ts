import { apiGet, apiPost } from './api';

export interface LocalVerifyResult {
  valid: boolean;
  reason?: 'invalid_syntax' | 'disposable_domain' | 'no_mx_record';
}

export interface VerificationOutcome {
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  isDeliverable: boolean;
  provider: 'local' | 'reoon' | 'neverbounce';
  cached: boolean;
}

// Free syntax/MX/disposable-domain check only.
export function localCheckEmail(email: string) {
  return apiPost<LocalVerifyResult>('/verification/local-check', { email });
}

// The paid Reoon/NeverBounce step — only ever called one-at-a-time from an
// explicit user click (the per-contact verify icon), never in bulk/automatically.
// Fails cleanly server-side if no real REOON_API_KEY/NEVERBOUNCE_API_KEY is
// configured, per CLAUDE.md — no cost is incurred either way.
export function verifyEmail(email: string) {
  return apiPost<VerificationOutcome>('/verification/check', { email });
}

export interface VerificationStats {
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  unverified: number;
}

export function getVerificationStats() {
  return apiGet<VerificationStats>('/verification/stats');
}

export interface BulkVerifyJobStatus {
  jobId: string;
  state: string;
  progress: number | object;
  result?: { totalContacts: number; checked: number; failed: number; lastError?: string };
  failedReason?: string;
}

export function startBulkVerify() {
  return apiPost<{ jobId: string }>('/verification/bulk-verify', {});
}

export function getBulkVerifyStatus(jobId: string) {
  return apiGet<BulkVerifyJobStatus>(`/verification/bulk-verify/${jobId}`);
}
