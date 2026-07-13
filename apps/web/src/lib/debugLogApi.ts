import { API_BASE_URL, apiGet, type Page } from './api';

export interface ErrorLogEntry {
  id: string;
  source: 'frontend' | 'backend';
  message: string;
  stack: string | null;
  path: string | null;
  context: Record<string, unknown> | null;
  createdAt: string;
}

export function listDebugLog(page = 1, limit = 50) {
  return apiGet<Page<ErrorLogEntry>>(`/debug-log?page=${page}&limit=${limit}`);
}

// Deliberately bypasses apiPost — reporting an error must never throw (that
// would trigger another error report) and must work even when unauthenticated
// (an error on the login page itself has no token yet). Fire-and-forget.
export function reportError(input: { message: string; stack?: string; path?: string; context?: Record<string, unknown> }) {
  try {
    fetch(`${API_BASE_URL}/debug-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'frontend', ...input }),
    }).catch(() => undefined);
  } catch {
    // Reporting is best-effort only.
  }
}
