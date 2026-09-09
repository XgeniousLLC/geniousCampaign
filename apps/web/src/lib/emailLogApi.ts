import { apiGet, apiPost, apiDelete, type Page } from './api';
import type { SendStatus } from './campaignsApi';

export const EMAIL_LOG_KEEP_DAYS_OPTIONS = [7, 30, 90, 180] as const;
export type EmailLogKeepDays = (typeof EMAIL_LOG_KEEP_DAYS_OPTIONS)[number];

export interface EmailLogRow {
  id: string;
  contactId: string;
  campaignId: string | null;
  sequenceId: string | null;
  provider: 'ses' | 'gmail';
  resolvedSubject: string;
  status: SendStatus;
  error: string | null;
  isDryRun: boolean;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailLogEvent {
  id: string;
  type: 'open' | 'click' | 'bounce' | 'complaint';
  url: string | null;
  createdAt: string;
}

export interface EmailLogDetail {
  send: EmailLogRow & { resolvedBodyHtml: string; resolvedBodyText: string };
  events: EmailLogEvent[];
}

export function listEmailLog(filter: { status?: SendStatus; campaignId?: string; sequenceId?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.campaignId) params.set('campaignId', filter.campaignId);
  if (filter.sequenceId) params.set('sequenceId', filter.sequenceId);
  params.set('page', String(filter.page ?? 1));
  params.set('limit', String(filter.limit ?? 50));
  return apiGet<Page<EmailLogRow>>(`/email-log?${params.toString()}`);
}

export function getEmailLogDetail(id: string) {
  return apiGet<EmailLogDetail>(`/email-log/${id}`);
}

export function resendEmail(id: string) {
  return apiPost<{ success: boolean; message: string }>(`/email-log/${id}/resend`, {});
}

// Permanently deletes every log entry older than keepDays — owner-only,
// cannot be undone.
export function clearEmailLog(keepDays: EmailLogKeepDays) {
  return apiDelete<{ deletedCount: number }>(`/email-log?keepDays=${keepDays}`);
}
