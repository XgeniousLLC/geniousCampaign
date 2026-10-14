import { apiDelete, apiGet, apiPatch, apiPost } from './api';

export type ThreadStatus =
  | 'uncategorized'
  | 'interested'
  | 'not_interested'
  | 'meeting_booked'
  | 'out_of_office'
  | 'closed';

export interface InboxThread {
  id: string;
  providerThreadId: string;
  enrollmentId: string | null;
  sequenceId: string | null;
  contactId: string | null;
  senderAccountId: string | null;
  subject: string | null;
  status: ThreadStatus;
  statusSource: string;
  isFinished: boolean;
  isRead: boolean;
  isStarred: boolean;
  lastInboundAt: string | null;
  unread: boolean;
  contact: { email: string; firstName: string | null; lastName: string | null } | null;
}

export interface InboxMessage {
  id: string;
  dir: 'out' | 'in';
  fromEmail: string | null;
  toEmail: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  sentAt: string | null;
}

export function listThreads(params: { tab?: string; status?: string; sequenceId?: string; q?: string; limit?: number; offset?: number } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  return apiGet<{ threads: InboxThread[]; total: number; limit: number; offset: number }>(`/inbox/threads?${qs}`);
}

export function getThread(id: string) {
  return apiGet<{ thread: InboxThread; messages: InboxMessage[]; contact: unknown }>(`/inbox/threads/${id}`);
}

export function patchThread(id: string, input: { isRead?: boolean; isStarred?: boolean; isFinished?: boolean }) {
  return apiPatch<InboxThread>(`/inbox/threads/${id}`, input);
}

export function setThreadStatus(id: string, status: ThreadStatus) {
  return apiPatch<InboxThread>(`/inbox/threads/${id}/status`, { status });
}

export function replyToThread(id: string, input: { html: string; text: string; cc?: string; bcc?: string }) {
  return apiPost<{ ok: boolean; providerMessageId: string }>(`/inbox/threads/${id}/reply`, input);
}

export interface ScheduledReply {
  id: string;
  threadId: string;
  html: string;
  text: string;
  cc: string | null;
  bcc: string | null;
  sendAt: string;
  status: string;
}

export function scheduleReply(id: string, input: { html: string; text: string; cc?: string; bcc?: string; sendAt: string }) {
  return apiPost<ScheduledReply>(`/inbox/threads/${id}/schedule`, input);
}

export function listScheduled() {
  return apiGet<ScheduledReply[]>('/inbox/scheduled');
}

export function getUnreadCount() {
  return apiGet<{ unread: number }>('/inbox/unread-count');
}

export function cancelScheduled(replyId: string) {
  return apiDelete<{ id: string }>(`/inbox/scheduled/${replyId}`);
}

export const STATUS_LABELS: Record<ThreadStatus, string> = {
  uncategorized: 'Uncategorized',
  interested: 'Interested',
  not_interested: 'Not Interested',
  meeting_booked: 'Meeting Booked',
  out_of_office: 'Out of Office',
  closed: 'Closed',
};
