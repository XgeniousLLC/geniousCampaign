import { apiGet, apiPost } from './api';
import type { Contact } from './contactsApi';

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: 'hard_bounce' | 'complaint' | 'manual_unsubscribe' | 'repeated_soft_bounce';
  source: string;
  createdAt: string;
}

export function listSuppressionList() {
  return apiGet<SuppressionEntry[]>('/suppression-list');
}

export function manualSuppress(contactId: string) {
  return apiPost<Contact>('/suppression-list/manual', { contactId });
}
