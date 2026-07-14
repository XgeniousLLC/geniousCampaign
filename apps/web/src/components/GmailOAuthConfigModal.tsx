import { useEffect, useState } from 'react';
import { getIntegrationSettings, updateIntegrationSettings, clearIntegrationSetting, type SettingCategory } from '../lib/settingsApi';
import { API_BASE_URL } from '../lib/api';
import { CloseIcon, CopyIcon, CheckCircleIcon } from './icons';

const CATEGORY_KEY = 'google_oauth';
const REDIRECT_URI_KEY = 'GOOGLE_OAUTH_REDIRECT_URI';
const COMPUTED_REDIRECT_URI = `${API_BASE_URL}/sender-accounts/gmail/callback`;
const URL_PATTERN = /(https?:\/\/[^\s")]+)/g;

// Instruction steps are plain text from the backend — turn bare URLs into
// clickable links rather than leaving them as copy-pasteable text.
function linkifyStep(step: string) {
  return step.split(URL_PATTERN).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent-light underline hover:text-accent">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

// One shared Google OAuth app (client ID/secret/redirect URI) that every
// Gmail mailbox connect goes through — configured here, on Sender Accounts,
// rather than buried in the general Settings > Integrations tab, since this
// is the credential "Connect Gmail account" directly depends on.
export function GmailOAuthConfigModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<SettingCategory | null>(null);
  const [values, setValues] = useState<Record<string, string>>({ [REDIRECT_URI_KEY]: COMPUTED_REDIRECT_URI });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    getIntegrationSettings().then((cats) => {
      const cat = cats.find((c) => c.key === CATEGORY_KEY) ?? null;
      setCategory(cat);
      if (cat) {
        setValues((prev) => {
          const next = { ...prev };
          for (const f of cat.fields) {
            // Redirect URI must exactly match what's registered in Google
            // Cloud Console — always reflect the saved value if one exists,
            // otherwise the value this API actually listens on, so there's
            // nothing to guess rather than an empty field.
            if (f.key === REDIRECT_URI_KEY) next[f.key] = f.value ?? COMPUTED_REDIRECT_URI;
            else if (!(f.key in next)) next[f.key] = f.secret ? '' : (f.value ?? '');
          }
          return next;
        });
      }
    });
  }

  function handleCopyRedirectUri() {
    navigator.clipboard.writeText(values[REDIRECT_URI_KEY] || COMPUTED_REDIRECT_URI);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(load, []);

  async function handleSave() {
    if (!category) return;
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const f of category.fields) if (values[f.key]) payload[f.key] = values[f.key];
      await updateIntegrationSettings(payload);
      setNotice('Saved.');
      load();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear(key: string) {
    await clearIntegrationSetting(key);
    setValues((prev) => ({ ...prev, [key]: '' }));
    load();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="flex max-h-[86vh] w-[520px] max-w-full flex-col rounded-xl border border-border-modal bg-panel2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-text-heading">Configure Gmail sending</h3>
            <p className="mt-0.5 text-[11px] text-text-faint">Google OAuth app — shared by every Gmail mailbox you connect.</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[18px]">
          {category?.instructions && (
            <ol className="mb-4 list-decimal space-y-1.5 rounded-md border border-border-subtle bg-surface p-3 pl-7 text-[11.5px] leading-relaxed text-text-tertiary">
              {category.instructions.map((step, i) => (
                <li key={i}>{linkifyStep(step)}</li>
              ))}
            </ol>
          )}

          {category?.fields.map((f) => (
            <div key={f.key} className="mb-3.5">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary">{f.label}</label>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`text-[10.5px] font-medium ${
                      f.source === 'db' ? 'text-success' : f.source === 'env' ? 'text-info' : 'text-text-faint'
                    }`}
                  >
                    {f.source === 'db' ? 'saved' : f.source === 'env' ? 'from .env' : 'not set'}
                  </span>
                  {f.source === 'db' && (
                    <button onClick={() => handleClear(f.key)} className="text-[10.5px] text-text-faint hover:text-danger">
                      Clear
                    </button>
                  )}
                </span>
              </div>
              {f.key === REDIRECT_URI_KEY ? (
                <div className="relative">
                  <input
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 pr-9 font-mono text-[12.5px] text-text-primary"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRedirectUri}
                    title="Copy"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-text-faint hover:bg-raised hover:text-text-secondary"
                  >
                    {copied ? <CheckCircleIcon className="text-success" /> : <CopyIcon />}
                  </button>
                </div>
              ) : (
                <input
                  type={f.secret ? 'password' : 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.secret ? (f.configured ? '•••••••• (leave blank to keep)' : 'Not set') : undefined}
                  className="h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
                />
              )}
            </div>
          ))}

          {notice && <div className="mb-2 text-xs text-success">{notice}</div>}
          {error && <div className="mb-2 text-xs text-danger">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <button onClick={onClose} className="h-[34px] rounded-md border border-border-subtle px-3.5 text-sm font-medium text-text-secondary hover:bg-raised">
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !category}
            className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
