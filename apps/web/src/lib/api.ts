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

// Inlined rather than importing debugLogApi.ts's reportError — that file
// imports apiGet/API_BASE_URL from this one, so importing it back here
// would create a circular module dependency. Same fire-and-forget shape.
function reportApiError(status: number, statusText: string, method: string, path: string, body: string) {
  try {
    fetch(`${API_BASE_URL}/debug-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'frontend',
        message: `API request failed: ${status} ${statusText}`,
        path,
        context: { method, status, body: body.slice(0, 2000) },
      }),
    }).catch(() => undefined);
  } catch {
    // Reporting is best-effort only.
  }
}

async function handle<T>(res: Response, method: string, path: string): Promise<T> {
  if (res.status === 401) {
    useAuthStore.getState().logout();
  }
  if (!res.ok) {
    const body = await res.text();
    // 401 is routine session-expiry (handled above via logout), not a bug
    // worth logging — everything else (validation errors, 5xx, etc.) is
    // reported so "every error occurring via an API call" is captured,
    // not just uncaught render/runtime exceptions.
    if (res.status !== 401) {
      reportApiError(res.status, res.statusText, method, path, body);
    }
    throw new Error(`API request failed: ${res.status} ${res.statusText} ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(`${API_BASE_URL}${path}`, { headers: { ...authHeaders() } }), 'GET', path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    }),
    'POST',
    path,
  );
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    }),
    'PATCH',
    path,
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return handle<T>(await fetch(`${API_BASE_URL}${path}`, { method: 'DELETE', headers: { ...authHeaders() } }), 'DELETE', path);
}

export function authHeadersForUpload(): Record<string, string> {
  return authHeaders();
}

export { API_BASE_URL };
