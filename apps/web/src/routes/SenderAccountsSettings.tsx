import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listSenderAccounts,
  getGmailConnectUrl,
  updateSenderAccount,
  deleteSenderAccount,
  type SenderAccount,
} from '../lib/senderAccountsApi';
import { SesAccountModal } from '../components/SesAccountModal';
import { useAuthStore } from '../stores/useAuthStore';

function quotaBarColor(pct: number): string {
  if (pct >= 90) return 'bg-danger';
  if (pct >= 70) return 'bg-warning';
  return 'bg-success';
}

const PROVIDER_LABEL: Record<SenderAccount['provider'], string> = { ses: 'SES', gmail: 'Gmail' };

export function SenderAccountsSettings() {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalAccount, setModalAccount] = useState<SenderAccount | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [params] = useSearchParams();
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  function load() {
    listSenderAccounts().then(setAccounts);
  }

  useEffect(() => {
    load();
    const connected = params.get('connected');
    const callbackError = params.get('error');
    if (connected) setError(null);
    if (callbackError) setError(callbackError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const { authUrl } = await getGmailConnectUrl();
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setConnecting(false);
    }
  }

  async function toggleActive(a: SenderAccount) {
    setBusy(a.id);
    try {
      await updateSenderAccount(a.id, { isActive: !a.isActive });
      load();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(a: SenderAccount) {
    setBusy(a.id);
    try {
      await deleteSenderAccount(a.id);
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Sender Accounts</h1>
          <p className="mt-1 text-xs text-text-muted">
            Sends are distributed across accounts based on remaining daily quota headroom.
          </p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalAccount('new')}
              className="flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-panel px-3 text-xs font-medium text-text-secondary hover:bg-raised"
            >
              Add AWS account
            </button>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-panel px-3 text-xs font-medium text-text-secondary hover:bg-raised disabled:opacity-50"
            >
              {connecting ? 'Redirecting…' : 'Connect Gmail account'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
      )}

      {params.get('connected') && (
        <div className="mb-4 rounded-md border border-success/25 bg-success/10 px-3 py-2 text-xs text-success">
          Connected {params.get('connected')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {accounts.map((a) => {
          const pct = a.dailySendLimit > 0 ? Math.min(100, Math.round((a.sentToday / a.dailySendLimit) * 100)) : 0;
          return (
            <div key={a.id} className="rounded-md border border-border-default bg-panel p-4">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-8 items-center rounded border border-border-subtle bg-surface px-2 text-[11px] font-semibold text-text-tertiary">
                  {PROVIDER_LABEL[a.provider]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text-primary">{a.displayName || a.email}</div>
                  <div className="font-mono text-[11px] text-text-faint">{a.email}</div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    a.isActive ? 'border-success/25 bg-success/10 text-success' : 'border-text-muted/25 bg-text-muted/10 text-text-muted'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {a.isActive ? 'active' : 'inactive'}
                </span>
              </div>

              {a.provider === 'ses' && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {a.awsRegion && (
                    <span className="rounded border border-border-subtle bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-text-tertiary">{a.awsRegion}</span>
                  )}
                  <span className={`rounded border px-1.5 py-0.5 text-[10.5px] ${a.hasCustomAwsCredentials ? 'border-info/25 bg-info/10 text-info' : 'border-border-subtle bg-surface text-text-faint'}`}>
                    {a.hasCustomAwsCredentials ? 'own AWS credentials' : 'using Settings > Integrations'}
                  </span>
                  {a.sesConfigurationSet && (
                    <span className="rounded border border-border-subtle bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-text-tertiary">{a.sesConfigurationSet}</span>
                  )}
                </div>
              )}

              <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-text-muted">
                <span>Daily quota</span>
                <span className="font-mono font-semibold text-text-secondary">
                  {a.sentToday} / {a.dailySendLimit}
                </span>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border-subtle">
                <div className={`h-full rounded-full ${quotaBarColor(pct)}`} style={{ width: `${pct}%` }} />
              </div>

              {canWrite && (
                <div className="flex items-center gap-1.5 border-t border-border-subtle pt-3">
                  {a.provider === 'ses' && (
                    <button
                      onClick={() => setModalAccount(a)}
                      className="h-7 rounded border border-border-default px-2 text-[11px] text-text-tertiary hover:bg-raised"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(a)}
                    disabled={busy === a.id}
                    className="h-7 rounded border border-border-default px-2 text-[11px] text-text-tertiary hover:bg-raised disabled:opacity-50"
                  >
                    {a.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    disabled={busy === a.id}
                    className="h-7 rounded border border-danger/30 px-2 text-[11px] text-danger hover:bg-danger/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {accounts.length === 0 && (
          <div className="col-span-2 rounded-md border border-border-default bg-panel px-3 py-8 text-center text-xs text-text-muted">
            No sender accounts yet — add an AWS account or connect a Gmail account above.
          </div>
        )}
      </div>

      {modalAccount && (
        <SesAccountModal
          account={modalAccount === 'new' ? undefined : modalAccount}
          onClose={() => setModalAccount(null)}
          onSaved={() => {
            setModalAccount(null);
            load();
          }}
        />
      )}
    </div>
  );
}
