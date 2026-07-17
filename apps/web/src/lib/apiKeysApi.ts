import { apiGet, apiPost, apiDelete } from './api';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  defaultListId: string | null;
  defaultTagIds: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKey {
  // Only present in the create/rotate response — never returned again after this.
  key: string;
}

export function listApiKeys() {
  return apiGet<ApiKey[]>('/api-keys');
}

export function createApiKey(input: { name: string; expiresAt?: string }) {
  return apiPost<CreatedApiKey>('/api-keys', input);
}

export function rotateApiKey(id: string) {
  return apiPost<CreatedApiKey>(`/api-keys/${id}/rotate`, {});
}

export function revokeApiKey(id: string) {
  return apiDelete<{ id: string }>(`/api-keys/${id}`);
}
