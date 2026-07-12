import { apiGet } from './api';
import type { SendStatus } from './campaignsApi';

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

export function listEmailLog(filter: { status?: SendStatus; campaignId?: string; sequenceId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.campaignId) params.set('campaignId', filter.campaignId);
  if (filter.sequenceId) params.set('sequenceId', filter.sequenceId);
  params.set('limit', String(filter.limit ?? 100));
  return apiGet<EmailLogRow[]>(`/email-log?${params.toString()}`);
}

export function getEmailLogDetail(id: string) {
  return apiGet<EmailLogDetail>(`/email-log/${id}`);
}
