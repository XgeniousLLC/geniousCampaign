import { apiGet } from './api';

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
