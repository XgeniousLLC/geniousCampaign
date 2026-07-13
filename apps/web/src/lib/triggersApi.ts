import { apiDelete, apiGet, apiPatch, apiPost } from './api';

export interface ConditionLeaf {
  field: string;
  op: 'equals' | 'contains' | 'gt' | 'lt' | 'in' | 'exists';
  value?: unknown;
}

export interface Trigger {
  id: string;
  name: string;
  eventType: string;
  conditions: ConditionLeaf;
  sequenceId: string;
  isActive: boolean;
  scheduleCron: string | null;
  scheduleTimezone: string | null;
  webhookEndpointId: string | null;
  createdAt: string;
  updatedAt: string;
  // Present on list responses only (GET /triggers) — computed server-side.
  firedCount?: number;
}

export interface TriggerStats {
  totalFires: number;
  enrolledCount: number;
  skippedCount: number;
  lastFiredAt: string | null;
}

export interface TriggerEvaluation {
  id: string;
  contactId: string;
  contactEmail: string;
  eventType: string;
  enrolled: boolean;
  error: string | null;
  createdAt: string;
}

export function listTriggers() {
  return apiGet<Trigger[]>('/triggers');
}

export function getTrigger(id: string) {
  return apiGet<Trigger>(`/triggers/${id}`);
}

export function getTriggerStats(id: string) {
  return apiGet<TriggerStats>(`/triggers/${id}/stats`);
}

export function listTriggerEvaluations(id: string, limit = 50) {
  return apiGet<TriggerEvaluation[]>(`/triggers/${id}/evaluations?limit=${limit}`);
}

export function createTrigger(input: {
  name: string;
  eventType: string;
  conditions: ConditionLeaf;
  sequenceId: string;
  scheduleCron?: string;
  scheduleTimezone?: string;
  webhookEndpointId?: string;
}) {
  return apiPost<Trigger>('/triggers', input);
}

export function updateTrigger(id: string, input: Partial<{ isActive: boolean }>) {
  return apiPatch<Trigger>(`/triggers/${id}`, input);
}

export function removeTrigger(id: string) {
  return apiDelete<{ id: string }>(`/triggers/${id}`);
}
