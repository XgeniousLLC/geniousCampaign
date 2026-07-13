import { apiGet, apiPost, type Page } from './api';
import type { Contact } from './contactsApi';

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: 'hard_bounce' | 'complaint' | 'manual_unsubscribe' | 'repeated_soft_bounce';
  source: string;
  createdAt: string;
}

export function listSuppressionList(page = 1, limit = 50) {
  return apiGet<Page<SuppressionEntry>>(`/suppression-list?page=${page}&limit=${limit}`);
}

export function manualSuppress(contactId: string) {
  return apiPost<Contact>('/suppression-list/manual', { contactId });
}
