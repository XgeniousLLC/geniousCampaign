import { useEffect, useState } from 'react';
import { listUsers, updateUserRole, type User } from '../lib/usersApi';
import { listAuditLog, type AuditLogEntry } from '../lib/auditLogApi';
import { listSuppressionList, type SuppressionEntry } from '../lib/suppressionApi';
import { useAuthStore } from '../stores/useAuthStore';

const TABS = ['Members', 'Audit log', 'Suppression list'] as const;
type Tab = (typeof TABS)[number];

const ROLE_STYLES: Record<User['role'], string> = {
  owner: 'border-accent/25 bg-accent/10 text-accent-light',
  editor: 'border-info/25 bg-info/10 text-info',
  viewer: 'border-text-muted/25 bg-text-muted/10 text-text-muted',
};

const SUPPRESSION_REASON_STYLES: Record<SuppressionEntry['reason'], string> = {
  hard_bounce: 'border-danger/25 bg-danger/10 text-danger',
  complaint: 'border-danger/25 bg-danger/10 text-danger',
  repeated_soft_bounce: 'border-warning/25 bg-warning/10 text-warning',
  manual_unsubscribe: 'border-text-muted/25 bg-text-muted/10 text-text-muted',
};

export function Settings() {
  const [tab, setTab] = useState<Tab>('Members');
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [suppression, setSuppression] = useState<SuppressionEntry[]>([]);
  const isOwner = useAuthStore((s) => s.user?.role === 'owner');

  useEffect(() => {
    if (tab === 'Members') listUsers().then(setUsers);
    if (tab === 'Audit log') listAuditLog(50).then(setAuditLog);
    if (tab === 'Suppression list') listSuppressionList().then(setSuppression);
  }, [tab]);

  async function handleRoleChange(userId: string, role: User['role']) {
    await updateUserRole(userId, role);
    listUsers().then(setUsers);
  }

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="text-lg font-semibold text-text-heading">Settings</h1>
        <p className="mt-1 text-xs text-text-muted">Team access, activity audit, and the global suppression list.</p>
      </div>

      <div className="mb-[18px] flex gap-5 border-b border-border-default">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-medium ${
              tab === t ? 'border-accent text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Members' && (
        <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="border-b border-border-default px-4 py-3 text-sm font-semibold text-text-primary">Team members</div>
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-t border-border-subtle px-4 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent-light">
                {u.email[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-xs text-text-secondary">{u.email}</div>
              </div>
              {isOwner ? (
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as User['role'])}
                  className={`h-[26px] rounded-full border px-2 text-[11px] font-semibold ${ROLE_STYLES[u.role]}`}
                >
                  <option value="owner">owner</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              ) : (
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ROLE_STYLES[u.role]}`}>{u.role}</span>
              )}
            </div>
          ))}
          {users.length === 0 && <div className="px-4 py-6 text-center text-xs text-text-muted">No users.</div>}
        </div>
      )}

      {tab === 'Audit log' && (
        <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
          {auditLog.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border-t border-border-subtle px-4 py-3 first:border-t-0">
              <span className="text-text-meta">◷</span>
              <div className="flex-1 text-xs text-text-tertiary">
                <b className="font-semibold text-text-secondary">{a.actorEmail}</b> · {a.action} · {a.entityType}
              </div>
              <span className="whitespace-nowrap text-[11.5px] text-text-faint">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {auditLog.length === 0 && <div className="px-4 py-6 text-center text-xs text-text-muted">No audit log entries yet.</div>}
        </div>
      )}

      {tab === 'Suppression list' && (
        <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="border-b border-border-default px-4 py-3 text-sm font-semibold text-text-primary">
            Suppression list · {suppression.length} addresses
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-text-meta">
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-2.5 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 text-right font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {suppression.map((s) => (
                <tr key={s.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{s.email}</td>
                  <td className="px-2.5 py-2.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SUPPRESSION_REASON_STYLES[s.reason]}`}>
                      {s.reason.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-faint">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {suppression.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-text-muted">
                    No suppressed addresses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
