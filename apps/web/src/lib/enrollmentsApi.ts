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
  /** "Step N" numbers (send_email steps only, matching the Steps tab), and
   * when the last send actually went out — derived from `sends`, since
   * currentStepId only ever points at what's next (invariant 3). */
  currentStepNumber: number | null;
  lastStepNumber: number | null;
  lastExecutedAt: string | null;
}

export function listEnrollmentsForContact(contactId: string) {
  return apiGet<Enrollment[]>(`/admin/sequences/contacts/${contactId}`);
}

export function listEnrollmentsForSequence(sequenceId: string) {
  return apiGet<Enrollment[]>(`/admin/sequences/${sequenceId}/enrollments`);
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
