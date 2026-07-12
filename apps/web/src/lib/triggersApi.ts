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
  createdAt: string;
  updatedAt: string;
}

export function listTriggers() {
  return apiGet<Trigger[]>('/triggers');
}

export function createTrigger(input: {
  name: string;
  eventType: string;
  conditions: ConditionLeaf;
  sequenceId: string;
  scheduleCron?: string;
  scheduleTimezone?: string;
}) {
  return apiPost<Trigger>('/triggers', input);
}

export function updateTrigger(id: string, input: Partial<{ isActive: boolean }>) {
  return apiPatch<Trigger>(`/triggers/${id}`, input);
}

export function removeTrigger(id: string) {
  return apiDelete<{ id: string }>(`/triggers/${id}`);
}
