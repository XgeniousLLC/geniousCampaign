import { useEffect, useState } from 'react';
import { listUsers, updateUserRole, type User } from '../lib/usersApi';
import { listAuditLog, type AuditLogEntry } from '../lib/auditLogApi';
import { listSuppressionList, type SuppressionEntry } from '../lib/suppressionApi';
import { listDebugLog, clearDebugLog, type ErrorLogEntry } from '../lib/debugLogApi';
import { getAiUsageSummary, type AiUsageSummary } from '../lib/aiAssistApi';
import {
  getIntegrationSettings,
  updateIntegrationSettings,
  clearIntegrationSetting,
  clearVerificationCache,
  type SettingCategory,
} from '../lib/settingsApi';
import { listApiKeys, createApiKey, rotateApiKey, revokeApiKey, type ApiKey, type CreatedApiKey } from '../lib/apiKeysApi';
import {
  listCustomFieldDefs,
  createCustomFieldDef,
  deleteCustomFieldDef,
  type CustomFieldDef,
  type CustomFieldInputType,
} from '../lib/customFieldsApi';
import { useAuthStore } from '../stores/useAuthStore';
import { InfoIcon, CloseIcon, CopyIcon, CheckCircleIcon } from '../components/icons';
import { PaginationBar } from '../components/PaginationBar';
import { AddMemberModal } from '../components/AddMemberModal';
import { TrackingDomainField } from '../components/TrackingDomainField';
import { SesSnsWebhookUrlField } from '../components/SesSnsWebhookUrlField';

const LOG_PAGE_SIZE = 20;

const TABS = ['Members', 'Audit log', 'Suppression list', 'Custom fields', 'Debug log', 'AI usage', 'API keys', 'Integrations'] as const;
type Tab = (typeof TABS)[number];

const INPUT_TYPE_LABELS: Record<CustomFieldInputType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  url: 'URL',
  boolean: 'Yes / no',
  select: 'Dropdown',
};

// Keys default to a 1-year expiry — see ApiKeysPanel's create form.
const DEFAULT_KEY_LIFETIME_DAYS = 365;

// Selectable models per LLM provider for Settings > Integrations > AI-assisted
// copy — keep in sync with apps/api/src/ai-assist/ai-assist.service.ts's
// DEFAULT_MODELS (the first entry in each list is that provider's default).
// Checked against each provider's live model list 2026-07-13 — deepseek-chat
// and deepseek-reasoner are deprecated 2026-07-24, replaced by the v4 names.
const AI_MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.4', 'gpt-4.1-mini', 'gpt-4o-mini'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
};

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
  invalid_email: 'border-danger/25 bg-danger/10 text-danger',
};

export function Settings() {
  const [tab, setTab] = useState<Tab>('Members');
  const [users, setUsers] = useState<User[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [suppression, setSuppression] = useState<SuppressionEntry[]>([]);
  const [suppressionPage, setSuppressionPage] = useState(1);
  const [suppressionTotal, setSuppressionTotal] = useState(0);
  const [debugLog, setDebugLog] = useState<ErrorLogEntry[]>([]);
  const [debugPage, setDebugPage] = useState(1);
  const [debugTotal, setDebugTotal] = useState(0);
  const [aiUsage, setAiUsage] = useState<AiUsageSummary | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [clearingDebugLog, setClearingDebugLog] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const isOwner = useAuthStore((s) => s.user?.role === 'owner');
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (tab === 'Members') listUsers().then(setUsers);
  }, [tab]);

  useEffect(() => {
    if (tab === 'Audit log') {
      listAuditLog(auditPage, LOG_PAGE_SIZE).then((res) => {
        setAuditLog(res.data);
        setAuditTotal(res.total);
      });
    }
  }, [tab, auditPage]);

  useEffect(() => {
    if (tab === 'Suppression list') {
      listSuppressionList(suppressionPage, LOG_PAGE_SIZE).then((res) => {
        setSuppression(res.data);
        setSuppressionTotal(res.total);
      });
    }
  }, [tab, suppressionPage]);

  useEffect(() => {
    if (tab === 'Debug log') {
      listDebugLog(debugPage, LOG_PAGE_SIZE).then((res) => {
        setDebugLog(res.data);
        setDebugTotal(res.total);
      });
    }
  }, [tab, debugPage]);

  useEffect(() => {
    if (tab === 'AI usage') getAiUsageSummary().then(setAiUsage);
  }, [tab]);

  async function handleRoleChange(userId: string, role: User['role']) {
    await updateUserRole(userId, role);
    listUsers().then(setUsers);
  }

  function handleCopyError(e: ErrorLogEntry) {
    navigator.clipboard.writeText(e.stack ? `${e.message}\n\n${e.stack}` : e.message);
    setCopiedLogId(e.id);
    setTimeout(() => setCopiedLogId((id) => (id === e.id ? null : id)), 1500);
  }

  async function handleClearDebugLog() {
    if (!confirm('Clear all debug log entries? This cannot be undone.')) return;
    setClearingDebugLog(true);
    try {
      await clearDebugLog();
      setDebugLog([]);
      setDebugTotal(0);
      setDebugPage(1);
    } finally {
      setClearingDebugLog(false);
    }
  }

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="text-lg font-semibold text-text-heading">Settings</h1>
        <p className="mt-1 text-xs text-text-muted">Team access, activity audit, and the global suppression list.</p>
      </div>

      <div className="mb-[18px] flex gap-5 border-b border-border-default">
        {TABS.filter((t) => (t !== 'Integrations' && t !== 'Debug log' && t !== 'AI usage' && t !== 'API keys') || isOwner).map((t) => (
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
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Team members</span>
            {isOwner && (
              <button
                onClick={() => setAddMemberOpen(true)}
                className="h-7 rounded-md border border-border-default bg-panel px-2.5 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Add member
              </button>
            )}
          </div>
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-t border-border-subtle px-4 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent-light">
                {(u.name || u.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-text-secondary">{u.name || u.email}</div>
                {u.name && <div className="truncate font-mono text-[11px] text-text-faint">{u.email}</div>}
              </div>
              {isOwner && u.id !== currentUserId ? (
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
                <span
                  title={u.id === currentUserId ? "You can't change your own role" : undefined}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ROLE_STYLES[u.role]}`}
                >
                  {u.role}
                </span>
              )}
            </div>
          ))}
          {users.length === 0 && <div className="px-4 py-6 text-center text-xs text-text-muted">No users.</div>}
        </div>
      )}

      {addMemberOpen && (
        <AddMemberModal
          onClose={() => setAddMemberOpen(false)}
          onCreated={() => {
            setAddMemberOpen(false);
            listUsers().then(setUsers);
          }}
        />
      )}

      {tab === 'Audit log' && (
        <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
          {auditLog.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border-t border-border-subtle px-4 py-3 first:border-t-0">
              <span className="text-text-meta">◷</span>
              <div className="flex-1 text-xs text-text-tertiary">
                <b className="font-semibold text-text-secondary">{a.actorName}</b> · {a.action} · {a.entityType}
              </div>
              <span className="whitespace-nowrap text-[11.5px] text-text-faint">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {auditLog.length === 0 && <div className="px-4 py-6 text-center text-xs text-text-muted">No audit log entries yet.</div>}
          {auditTotal > 0 && <PaginationBar page={auditPage} limit={LOG_PAGE_SIZE} total={auditTotal} onPageChange={setAuditPage} />}
        </div>
      )}

      {tab === 'Suppression list' && (
        <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="border-b border-border-default px-4 py-3 text-sm font-semibold text-text-primary">
            Suppression list · {suppressionTotal} addresses
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
          {suppressionTotal > 0 && (
            <PaginationBar page={suppressionPage} limit={LOG_PAGE_SIZE} total={suppressionTotal} onPageChange={setSuppressionPage} />
          )}
        </div>
      )}

      {tab === 'Custom fields' && <CustomFieldsPanel isOwner={isOwner} />}

      {tab === 'Debug log' && isOwner && (
        <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Debug log · {debugTotal} errors</span>
            {debugLog.length > 0 && (
              <button
                onClick={handleClearDebugLog}
                disabled={clearingDebugLog}
                className="h-7 rounded-md border border-border-default bg-panel px-2.5 text-xs font-medium text-text-secondary hover:border-danger/25 hover:text-danger disabled:opacity-50"
              >
                {clearingDebugLog ? 'Clearing…' : 'Clear logs'}
              </button>
            )}
          </div>
          {debugLog.map((e) => (
            <div key={e.id} className="border-t border-border-subtle first:border-t-0">
              <div className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-raised">
                <button
                  onClick={() => setExpandedLogId((id) => (id === e.id ? null : e.id))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                      e.source === 'backend' ? 'border-danger/25 bg-danger/10 text-danger' : 'border-warning/25 bg-warning/10 text-warning'
                    }`}
                  >
                    {e.source}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-text-secondary">{e.message}</div>
                    {e.path && <div className="truncate font-mono text-[10.5px] text-text-faint">{e.path}</div>}
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-text-faint">{new Date(e.createdAt).toLocaleString()}</span>
                </button>
                <button
                  onClick={() => handleCopyError(e)}
                  title="Copy error"
                  className="shrink-0 text-[11px] text-text-faint hover:text-text-secondary"
                >
                  {copiedLogId === e.id ? 'Copied' : 'Copy'}
                </button>
              </div>
              {expandedLogId === e.id && e.stack && (
                <pre className="overflow-x-auto whitespace-pre-wrap break-all border-t border-border-subtle bg-surface px-4 py-3 text-[10.5px] leading-relaxed text-text-faint">
                  {e.stack}
                </pre>
              )}
            </div>
          ))}
          {debugLog.length === 0 && <div className="px-4 py-6 text-center text-xs text-text-muted">No errors logged — good sign.</div>}
          {debugTotal > 0 && <PaginationBar page={debugPage} limit={LOG_PAGE_SIZE} total={debugTotal} onPageChange={setDebugPage} />}
        </div>
      )}

      {tab === 'AI usage' && isOwner && aiUsage && (
        <div className="max-w-3xl">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border-default bg-panel p-4">
              <div className="text-[11px] font-medium text-text-muted">Total calls</div>
              <div className="mt-1 text-xl font-semibold text-text-heading">{aiUsage.totals.calls.toLocaleString()}</div>
            </div>
            <div className="rounded-md border border-border-default bg-panel p-4">
              <div className="text-[11px] font-medium text-text-muted">Total tokens</div>
              <div className="mt-1 text-xl font-semibold text-text-heading">
                {(aiUsage.totals.promptTokens + aiUsage.totals.completionTokens).toLocaleString()}
              </div>
            </div>
            <div className="rounded-md border border-border-default bg-panel p-4">
              <div className="text-[11px] font-medium text-text-muted">Estimated cost</div>
              <div className="mt-1 text-xl font-semibold text-text-heading">
                ${aiUsage.totals.costUsd.toFixed(2)}
                {aiUsage.totals.hasUnknownCost && <span className="ml-1 text-[11px] font-normal text-warning">+ unknown</span>}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-border-default bg-panel">
            <div className="border-b border-border-default px-4 py-3 text-sm font-semibold text-text-primary">By provider &amp; model</div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-text-muted">
                  <th className="px-4 py-2 font-medium">Provider</th>
                  <th className="px-4 py-2 font-medium">Model</th>
                  <th className="px-4 py-2 font-medium">Calls</th>
                  <th className="px-4 py-2 font-medium">Prompt tokens</th>
                  <th className="px-4 py-2 font-medium">Completion tokens</th>
                  <th className="px-4 py-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {aiUsage.byModel.map((row) => (
                  <tr key={`${row.provider}-${row.model}`} className="border-t border-border-subtle">
                    <td className="px-4 py-2 text-text-secondary">{row.provider}</td>
                    <td className="px-4 py-2 font-mono text-text-secondary">{row.model}</td>
                    <td className="px-4 py-2 text-text-secondary">{row.calls.toLocaleString()}</td>
                    <td className="px-4 py-2 text-text-secondary">{row.promptTokens.toLocaleString()}</td>
                    <td className="px-4 py-2 text-text-secondary">{row.completionTokens.toLocaleString()}</td>
                    <td className="px-4 py-2 text-text-secondary">
                      {row.costUsd === null ? <span className="text-text-faint">unknown</span> : `$${row.costUsd.toFixed(4)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {aiUsage.byModel.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-text-muted">No AI Assist calls recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'API keys' && isOwner && <ApiKeysPanel />}

      {tab === 'Integrations' && isOwner && <IntegrationsPanel />}
    </div>
  );
}

function defaultExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_KEY_LIFETIME_DAYS);
  return d.toISOString().slice(0, 10);
}

function ApiKeysPanel() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState(defaultExpiryDate());
  const [neverExpire, setNeverExpire] = useState(false);
  const [revealedKey, setRevealedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    return listApiKeys().then(setApiKeys);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    const created = await createApiKey({
      name: newKeyName.trim(),
      expiresAt: neverExpire ? undefined : new Date(newKeyExpiry).toISOString(),
    });
    setRevealedKey(created);
    setNewKeyName('');
    setNewKeyExpiry(defaultExpiryDate());
    setNeverExpire(false);
    load();
  }

  async function handleRotate(id: string) {
    const rotated = await rotateApiKey(id);
    setRevealedKey(rotated);
    load();
  }

  async function handleRevoke(id: string) {
    await revokeApiKey(id);
    load();
  }

  function handleCopyKey() {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function expiryLabel(k: ApiKey): { text: string; warn: boolean } {
    if (!k.expiresAt) return { text: 'Never expires', warn: true };
    const expired = new Date(k.expiresAt).getTime() < Date.now();
    return { text: `${expired ? 'Expired' : 'Expires'} ${new Date(k.expiresAt).toLocaleDateString()}`, warn: expired };
  }

  return (
    <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
      <div className="border-b border-border-default px-4 py-3">
        <div className="text-sm font-semibold text-text-primary">API keys</div>
        <div className="mt-0.5 text-[11.5px] text-text-faint">
          For external forms/automation tools to push contacts in — endpoint reference, payload/response examples in{' '}
          <code className="rounded bg-field px-1 py-0.5 font-mono text-[10.5px]">docs/PUBLIC_API.md</code>.
        </div>
      </div>

      {revealedKey && (
        <div className="m-3 rounded-md border border-warning/25 bg-warning/10 p-3 text-[11.5px] text-text-secondary">
          <div className="mb-1.5 font-medium text-warning">Copy this now — "{revealedKey.name}" won't be shown again.</div>
          <div className="flex items-center gap-2 rounded-md border border-border-default bg-field px-2.5 py-2">
            <span className="flex-1 truncate font-mono text-[11.5px] text-text-secondary">{revealedKey.key}</span>
            <button onClick={handleCopyKey} title="Copy" className="shrink-0 text-text-faint hover:text-text-secondary">
              {copied ? <CheckCircleIcon className="text-success" /> : <CopyIcon />}
            </button>
          </div>
          <button onClick={() => setRevealedKey(null)} className="mt-2 text-[11px] text-text-faint hover:text-text-secondary">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-4 text-center text-xs text-text-muted">Loading…</div>
      ) : (
        <div className="p-1.5">
          {apiKeys.map((k) => {
            const expiry = expiryLabel(k);
            return (
              <div key={k.id} className="flex items-center justify-between rounded-md px-2.5 py-2.5 hover:bg-raised">
                <div>
                  <div className="text-sm font-medium text-text-secondary">{k.name}</div>
                  <div className="mt-1 font-mono text-[11.5px] text-text-faint">{k.keyPrefix}••••</div>
                  <div className="mt-1 text-[11px] text-text-faint">
                    <span className={expiry.warn ? 'text-warning' : undefined}>{expiry.text}</span>
                    {' · '}
                    {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleString()}` : 'never used'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button onClick={() => handleRotate(k.id)} className="text-[11px] text-text-faint hover:text-text-secondary">
                    Rotate
                  </button>
                  <button onClick={() => handleRevoke(k.id)} className="text-[11px] text-text-faint hover:text-danger">
                    Revoke
                  </button>
                </div>
              </div>
            );
          })}
          {apiKeys.length === 0 && <div className="px-2.5 py-4 text-center text-xs text-text-faint">No API keys yet.</div>}
        </div>
      )}

      <div className="border-t border-border-subtle p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Name (e.g. Website contact form)"
            className="h-7 flex-1 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint"
          />
          <input
            type="date"
            value={newKeyExpiry}
            disabled={neverExpire}
            onChange={(e) => setNewKeyExpiry(e.target.value)}
            className="h-7 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary disabled:opacity-40"
          />
          <label className="flex items-center gap-1.5 text-[11px] text-text-faint">
            <input type="checkbox" checked={neverExpire} onChange={(e) => setNeverExpire(e.target.checked)} />
            Never expire
          </label>
          <button onClick={handleCreate} className="h-7 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-raised">
            Create key
          </button>
        </div>
        {neverExpire && (
          <div className="mt-2 text-[11px] text-warning">
            Warning: this key will never expire. A leaked or forgotten key stays valid forever — prefer setting an expiry date.
          </div>
        )}
      </div>
    </div>
  );
}

function CustomFieldsPanel({ isOwner }: { isOwner: boolean }) {
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [inputType, setInputType] = useState<CustomFieldInputType>('text');
  const [optionsText, setOptionsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    return listCustomFieldDefs().then(setFields);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setError(null);
    if (!label.trim()) {
      setError('Label is required.');
      return;
    }
    const options = optionsText
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (inputType === 'select' && options.length === 0) {
      setError('Add at least one option (comma-separated).');
      return;
    }
    setSaving(true);
    try {
      await createCustomFieldDef({ label: label.trim(), inputType, options: inputType === 'select' ? options : undefined });
      setLabel('');
      setInputType('text');
      setOptionsText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create custom field.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteCustomFieldDef(id);
    load();
  }

  return (
    <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
      <div className="border-b border-border-default px-4 py-3">
        <div className="text-sm font-semibold text-text-primary">Custom fields</div>
        <div className="mt-0.5 text-[11.5px] text-text-faint">Extra fields available on every contact, shown on the Add contact form.</div>
      </div>

      {loading ? (
        <div className="p-4 text-center text-xs text-text-muted">Loading…</div>
      ) : (
        <div className="p-1.5">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-md px-2.5 py-2.5 hover:bg-raised">
              <div>
                <div className="text-sm font-medium text-text-secondary">{f.label}</div>
                <div className="mt-1 text-[11px] text-text-faint">
                  <code className="rounded bg-field px-1 py-0.5 font-mono text-[10.5px]">{f.key}</code> · {INPUT_TYPE_LABELS[f.inputType]}
                  {f.inputType === 'select' && f.options && <> · {f.options.join(', ')}</>}
                </div>
              </div>
              {isOwner && (
                <button onClick={() => handleDelete(f.id)} className="shrink-0 text-[11px] text-text-faint hover:text-danger">
                  Delete
                </button>
              )}
            </div>
          ))}
          {fields.length === 0 && <div className="px-2.5 py-4 text-center text-xs text-text-faint">No custom fields yet.</div>}
        </div>
      )}

      {isOwner && (
        <div className="border-t border-border-subtle p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Field label (e.g. Company size)"
              className="h-7 flex-1 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint"
            />
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as CustomFieldInputType)}
              className="h-7 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary"
            >
              {(Object.keys(INPUT_TYPE_LABELS) as CustomFieldInputType[]).map((t) => (
                <option key={t} value={t}>
                  {INPUT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="h-7 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-raised disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create field'}
            </button>
          </div>
          {inputType === 'select' && (
            <input
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Options, comma-separated (e.g. Small, Medium, Large)"
              className="mt-1.5 h-7 w-full rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint"
            />
          )}
          {error && <div className="mt-2 text-[11px] text-danger">{error}</div>}
        </div>
      )}
    </div>
  );
}

function IntegrationsPanel() {
  const [categories, setCategories] = useState<SettingCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpCategory, setHelpCategory] = useState<SettingCategory | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  function load() {
    getIntegrationSettings().then((allCats) => {
      // google_oauth is configured from Sender Accounts (it's what
      // "Connect Gmail account" directly depends on), not this general tab.
      const cats = allCats.filter((c) => c.key !== 'google_oauth');
      setCategories(cats);
      setActiveCategory((prev) => prev ?? cats[0]?.key ?? null);
      setValues((prev) => {
        const next = { ...prev };
        for (const cat of cats) {
          for (const f of cat.fields) {
            if (!(f.key in next)) next[f.key] = f.secret ? '' : (f.value ?? '');
          }
        }
        return next;
      });
    });
  }

  useEffect(load, []);

  async function handleSave(category: SettingCategory) {
    setError(null);
    setSavingCategory(category.key);
    try {
      const payload: Record<string, string> = {};
      for (const f of category.fields) {
        // verifyOnly fields (TRACKING_DOMAIN) have their own dedicated save
        // path (DNS check first) — never send them through the bulk PATCH.
        if (f.verifyOnly) continue;
        if (values[f.key]) payload[f.key] = values[f.key];
      }
      const updated = await updateIntegrationSettings(payload);
      setCategories(updated);
      setValues((prev) => {
        const next = { ...prev };
        for (const f of category.fields) if (f.secret) next[f.key] = '';
        return next;
      });
      setNotice(`Saved ${category.label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingCategory(null);
    }
  }

  async function handleClear(key: string) {
    const updated = await clearIntegrationSetting(key);
    setCategories(updated);
    setValues((prev) => ({ ...prev, [key]: '' }));
  }

  async function handleClearVerificationCache() {
    setClearingCache(true);
    try {
      const { cleared } = await clearVerificationCache();
      setNotice(`Cleared ${cleared} cached verification result${cleared === 1 ? '' : 's'} — everything re-checks against the current default provider next time.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache.');
    } finally {
      setClearingCache(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-xs text-text-muted">
        Credentials saved here override <code className="rounded bg-field px-1 py-0.5 font-mono text-[11px]">.env</code> immediately — no server
        restart needed. Clearing a field falls back to <code className="rounded bg-field px-1 py-0.5 font-mono text-[11px]">.env</code> again.
      </p>

      {notice && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-success/25 bg-success/10 px-3 py-2 text-xs text-success">
          {notice}
          <button onClick={() => setNotice(null)} className="text-success/70 hover:text-success">
            Dismiss
          </button>
        </div>
      )}
      {error && <div className="mb-3 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

      <div className="mb-4 flex gap-1 rounded-md border border-border-default bg-panel p-1">
        {categories.map((category) => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(category.key)}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              activeCategory === category.key ? 'bg-raised text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {categories
        .filter((category) => category.key === activeCategory)
        .map((category) => (
          <div key={category.key} className="overflow-hidden rounded-md border border-border-default bg-panel">
            <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-semibold text-text-primary">{category.label}</div>
                  <div className="text-[11px] text-text-faint">{category.description}</div>
                </div>
                {category.instructions && (
                  <button
                    onClick={() => setHelpCategory(category)}
                    title="How to configure"
                    className="shrink-0 text-text-faint hover:text-accent-light"
                  >
                    <InfoIcon />
                  </button>
                )}
              </div>
              {category.fields.length > 0 && (
                <button
                  onClick={() => handleSave(category)}
                  disabled={savingCategory === category.key}
                  className="h-8 shrink-0 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {savingCategory === category.key ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
            {category.key === 'ses_sns' && (
              <div className="p-4">
                <SesSnsWebhookUrlField />
              </div>
            )}
            <div className="flex flex-col gap-3 p-4">
              {category.fields
                .filter((f) => {
                  if (category.key === 'ai') {
                    const currentProvider = values['LLM_PROVIDER'] || 'openai';
                    if (f.key === 'OPENAI_API_KEY') return currentProvider === 'openai';
                    if (f.key === 'DEEPSEEK_API_KEY') return currentProvider === 'deepseek';
                  }
                  return true;
                })
                .map((f) => (
                <label key={f.key} className="block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-text-muted">{f.label}</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`text-[10.5px] font-medium ${
                          f.source === 'db' ? 'text-success' : f.source === 'env' ? 'text-info' : 'text-text-faint'
                        }`}
                      >
                        {f.source === 'db' ? 'saved here' : f.source === 'env' ? 'from .env' : 'not set'}
                      </span>
                      {f.source === 'db' && (
                        <button onClick={() => handleClear(f.key)} className="text-[10.5px] text-text-faint hover:text-danger">
                          Clear
                        </button>
                      )}
                    </span>
                  </div>
                  {(() => {
                    if (f.verifyOnly) {
                      return <TrackingDomainField field={f} onSaved={load} />;
                    }
                    const selectOptions =
                      f.options ?? (category.key === 'ai' && f.key === 'LLM_MODEL' ? AI_MODEL_OPTIONS[values['LLM_PROVIDER'] || 'openai'] : undefined);
                    if (selectOptions) {
                      const current = selectOptions.includes(values[f.key]) ? values[f.key] : selectOptions[0];
                      return (
                        <select
                          value={current}
                          onChange={(e) => {
                            const next = e.target.value;
                            setValues((prev) => ({
                              ...prev,
                              [f.key]: next,
                              // Switching provider invalidates whatever model was
                              // picked for the previous provider — clear it so the
                              // model select recomputes its own default instead of
                              // saving a model that belongs to the old provider.
                              ...(f.key === 'LLM_PROVIDER' ? { LLM_MODEL: '' } : {}),
                            }));
                          }}
                          className="h-8 w-full rounded border border-border-default bg-field px-2 text-xs text-text-primary outline-none focus:border-border-emphasis"
                        >
                          {selectOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      );
                    }
                    return (
                      <input
                        type={f.secret ? 'password' : 'text'}
                        value={values[f.key] ?? ''}
                        onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.secret ? (f.configured ? '•••••••• (leave blank to keep)' : 'Not set') : undefined}
                        className="h-8 w-full rounded border border-border-default bg-field px-2 text-xs text-text-primary outline-none placeholder:text-text-faint focus:border-border-emphasis"
                      />
                    );
                  })()}
                </label>
              ))}
              {category.key === 'verification' && (
                <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                  <div className="text-[11px] text-text-faint">
                    Force every cached email to re-check against the current default provider on its next verify.
                  </div>
                  <button
                    onClick={handleClearVerificationCache}
                    disabled={clearingCache}
                    className="h-7 shrink-0 rounded-md border border-border-default bg-panel px-2.5 text-[11px] font-medium text-text-secondary hover:bg-raised disabled:opacity-50"
                  >
                    {clearingCache ? 'Clearing…' : 'Clear cached results'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

      {helpCategory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={() => setHelpCategory(null)}>
          <div
            className="flex max-h-[80vh] w-[440px] max-w-full flex-col rounded-xl border border-border-modal bg-panel2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
              <h3 className="text-sm font-semibold text-text-heading">How to configure {helpCategory.label}</h3>
              <button onClick={() => setHelpCategory(null)} className="text-text-muted hover:text-text-primary">
                <CloseIcon />
              </button>
            </div>
            <ol className="flex-1 list-decimal space-y-2.5 overflow-y-auto p-[18px] pl-9 text-xs text-text-secondary">
              {helpCategory.instructions?.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
