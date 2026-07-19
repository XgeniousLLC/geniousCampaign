import { apiDelete, apiGet, apiPatch, apiPost } from './api';

export type StepType = 'send_email' | 'wait' | 'condition' | 'exit';
export type DelayUnit = 'minutes' | 'hours' | 'days';

export interface Sequence {
  id: string;
  name: string;
  description: string | null;
  // Sequence-level on/off switch — blocks new enrollments (manual, public
  // API, and trigger-driven) when false. Doesn't affect contacts already
  // enrolled; that's the separate per-enrollment pause/resume/stop control.
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Present on list responses only (GET /sequences) — computed server-side.
  stepCount?: number;
  enrolledCount?: number;
  openCount?: number;
  hasActiveEnrollments?: boolean;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  order: number;
  type: StepType;
  templateId: string | null;
  delayValue: number | null;
  delayUnit: DelayUnit | null;
}

export function listSequences() {
  return apiGet<Sequence[]>('/sequences');
}

export function getSequence(id: string) {
  return apiGet<Sequence>(`/sequences/${id}`);
}

export function createSequence(input: { name: string; description?: string }) {
  return apiPost<Sequence>('/sequences', input);
}

export function updateSequence(id: string, input: { name?: string; description?: string; isActive?: boolean }) {
  return apiPatch<Sequence>(`/sequences/${id}`, input);
}

export function listSteps(sequenceId: string) {
  return apiGet<SequenceStep[]>(`/sequences/${sequenceId}/steps`);
}

export function addStep(
  sequenceId: string,
  input: { type: StepType; templateId?: string; delayValue?: number; delayUnit?: DelayUnit },
) {
  return apiPost<SequenceStep>(`/sequences/${sequenceId}/steps`, input);
}

export function updateStep(
  sequenceId: string,
  stepId: string,
  input: Partial<{ type: StepType; templateId: string; delayValue: number; delayUnit: DelayUnit }>,
) {
  return apiPatch<SequenceStep>(`/sequences/${sequenceId}/steps/${stepId}`, input);
}

export function removeStep(sequenceId: string, stepId: string) {
  return apiDelete<{ id: string }>(`/sequences/${sequenceId}/steps/${stepId}`);
}

export function reorderSteps(sequenceId: string, stepIds: string[]) {
  return apiPost<SequenceStep[]>(`/sequences/${sequenceId}/steps/reorder`, { stepIds });
}
