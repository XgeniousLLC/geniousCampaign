import { useState } from 'react';
import { getGmailConnectUrl } from '../lib/senderAccountsApi';
import { API_BASE_URL } from '../lib/api';
import { CloseIcon } from './icons';

const COMPUTED_REDIRECT_URI = `${API_BASE_URL}/sender-accounts/gmail/callback`;

const inputCls =
  'h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint';

/**
 * Connect a Gmail mailbox. Either through the shared Settings OAuth app
 * (default) or with this mailbox's own Google OAuth client — several Google
 * Workspace domains, each with its own client, can be connected side by side.
 */
export function GmailConnectModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'shared' | 'custom'>('shared');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(COMPUTED_REDIRECT_URI);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConnect = mode === 'shared' || (!!clientId.trim() && !!clientSecret.trim());

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const { authUrl } = await getGmailConnectUrl(
        mode === 'custom'
          ? {
              clientId: clientId.trim(),
              clientSecret: clientSecret.trim(),
              redirectUri: redirectUri.trim() || undefined,
            }
          : {},
      );
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="flex w-[520px] max-w-full flex-col rounded-xl border border-border-modal bg-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-text-heading">Connect a Gmail account</h3>
            <p className="mt-0.5 text-[11px] text-text-faint">
              Each mailbox can use the shared OAuth app or its own Google client.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <CloseIcon />
          </button>
        </div>

        <div className="p-[18px]">
          <div className="mb-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setMode('shared')}
              className={`rounded-md border px-3 py-2 text-left text-xs ${
                mode === 'shared'
                  ? 'border-accent bg-accent/10 text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:bg-raised'
              }`}
            >
              <span className="font-semibold">Use the shared OAuth app</span>
              <span className="mt-0.5 block text-[11px] text-text-faint">
                Every mailbox goes through the Google OAuth app configured in Settings.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`rounded-md border px-3 py-2 text-left text-xs ${
                mode === 'custom'
                  ? 'border-accent bg-accent/10 text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:bg-raised'
              }`}
            >
              <span className="font-semibold">Use this mailbox's own OAuth app</span>
              <span className="mt-0.5 block text-[11px] text-text-faint">
                For a Google Cloud project with its own client id/secret — the credentials are
                saved on this account and used for all its sends.
              </span>
            </button>
          </div>

          {mode === 'custom' && (
            <div className="mb-4 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-text-label">
                  Client ID
                </label>
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxxxxx.apps.googleusercontent.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-text-label">
                  Client secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="GOCSPX-…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-text-label">
                  Redirect URI
                </label>
                <input
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  className={`${inputCls} font-mono text-[12px]`}
                />
                <p className="mt-1 text-[10.5px] text-text-faint">
                  Must be registered exactly in that Google Cloud project.
                </p>
              </div>
            </div>
          )}

          {error && <div className="mb-2 text-xs text-danger">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <button
            onClick={onClose}
            className="h-[34px] rounded-md border border-border-subtle px-3.5 text-sm font-medium text-text-secondary hover:bg-raised"
          >
            Cancel
          </button>
          <button
            onClick={start}
            disabled={!canConnect || busy}
            className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? 'Redirecting…' : 'Continue to Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
