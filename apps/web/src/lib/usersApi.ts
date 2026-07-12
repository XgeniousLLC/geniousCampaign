import { apiGet, apiPatch } from './api';

export interface User {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: string;
}

export function listUsers() {
  return apiGet<User[]>('/users');
}

export function updateUserRole(id: string, role: User['role']) {
  return apiPatch<User>(`/users/${id}/role`, { role });
}
