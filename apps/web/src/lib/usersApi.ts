import { apiGet, apiPatch, apiPost } from './api';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: string;
}

export function listUsers() {
  return apiGet<User[]>('/users');
}

export function updateUserRole(id: string, role: User['role']) {
  return apiPatch<User>(`/users/${id}/role`, { role });
}

export function createUser(input: { email: string; password: string; role: User['role']; name?: string }) {
  return apiPost<User>('/users', input);
}
