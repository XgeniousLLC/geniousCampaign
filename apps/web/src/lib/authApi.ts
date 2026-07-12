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

export function forgotPassword(email: string) {
  return apiPost<{ message: string }>('/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string) {
  return apiPost<{ message: string }>('/auth/reset-password', { token, newPassword });
}
