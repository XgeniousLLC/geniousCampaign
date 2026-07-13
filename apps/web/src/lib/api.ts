import { useAuthStore } from '../stores/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// Shared server-pagination envelope — audit log, suppression list, email log.
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    useAuthStore.getState().logout();
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API request failed: ${res.status} ${res.statusText} ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(`${API_BASE_URL}${path}`, { headers: { ...authHeaders() } }));
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    }),
  );
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    }),
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return handle<T>(await fetch(`${API_BASE_URL}${path}`, { method: 'DELETE', headers: { ...authHeaders() } }));
}

export function authHeadersForUpload(): Record<string, string> {
  return authHeaders();
}

export { API_BASE_URL };
