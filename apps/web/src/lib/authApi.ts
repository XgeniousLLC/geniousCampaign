import { apiGet, apiPatch, apiPost } from './api';

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; role: 'owner' | 'editor' | 'viewer'; name: string | null };
}

export interface Me {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: string;
}

export function getMe() {
  return apiGet<Me>('/auth/me');
}

export function updateProfile(input: { name?: string; email?: string }) {
  return apiPatch<Me>('/auth/me', input);
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiPatch<{ success: boolean }>('/auth/me/password', { currentPassword, newPassword });
}

export function login(email: string, password: string, rememberMe?: boolean) {
  return apiPost<AuthResponse>('/auth/login', { email, password, rememberMe });
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
