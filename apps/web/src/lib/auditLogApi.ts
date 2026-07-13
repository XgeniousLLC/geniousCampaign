import { apiGet, type Page } from './api';

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function listAuditLog(page = 1, limit = 50) {
  return apiGet<Page<AuditLogEntry>>(`/audit-log?page=${page}&limit=${limit}`);
}
