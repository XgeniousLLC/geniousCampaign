import { apiPost } from './api';

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; role: 'owner' | 'editor' | 'viewer' };
}

export function login(email: string, password: string) {
  return apiPost<AuthResponse>('/auth/login', { email, password });
}

export function register(email: string, password: string) {
  return apiPost<AuthResponse>('/auth/register', { email, password });
}
