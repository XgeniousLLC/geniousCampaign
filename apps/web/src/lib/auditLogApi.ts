import { apiGet } from './api';

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function listAuditLog(limit = 50) {
  return apiGet<AuditLogEntry[]>(`/audit-log?limit=${limit}`);
}
