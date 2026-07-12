import { apiGet, apiPost } from './api';

export type EnrollmentStatus = 'active' | 'paused' | 'stopped' | 'completed';

export interface Enrollment {
  id: string;
  sequenceId: string;
  contactId: string;
  status: EnrollmentStatus;
  currentStepId: string | null;
  nextRunAt: string | null;
  enrolledAt: string;
  updatedAt: string;
}

export function listEnrollmentsForContact(contactId: string) {
  return apiGet<Enrollment[]>(`/admin/sequences/contacts/${contactId}`);
}

export function enrollContact(sequenceId: string, contactId: string) {
  return apiPost<Enrollment>(`/admin/sequences/${sequenceId}/enroll`, { contactId });
}

export function pauseEnrollment(sequenceId: string, contactId: string) {
  return apiPost<Enrollment>(`/admin/sequences/${sequenceId}/pause`, { contactId });
}

export function resumeEnrollment(sequenceId: string, contactId: string) {
  return apiPost<Enrollment>(`/admin/sequences/${sequenceId}/resume`, { contactId });
}

export function stopEnrollment(sequenceId: string, contactId: string) {
  return apiPost<Enrollment>(`/admin/sequences/${sequenceId}/stop`, { contactId });
}
