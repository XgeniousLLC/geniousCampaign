import { useState } from 'react';
import { updateSenderAccount, type SenderAccount } from '../lib/senderAccountsApi';
import { CloseIcon } from './icons';

/**
 * Edit one account's app-enforced daily send cap. Gmail accounts have no
 * other editable field (credentials come from the OAuth connect), so this is
 * the Gmail "Edit" action; it works for any provider.
 */
export function DailyQuotaModal({
  account,
  onClose,
  onSaved,
}: {
  account: SenderAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [limit, setLimit] = useState(String(account.dailySendLimit));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Number(limit);
    if (!Number.isInteger(n) || n <= 0) {
      setError('Enter a whole number greater than 0.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateSenderAccount(account.id, { dailySendLimit: n });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="w-[420px] max-w-full rounded-xl border border-border-modal bg-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <h3 className="text-sm font-semibold text-text-heading">Daily send limit</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <CloseIcon />
          </button>
        </div>

        <div className="p-[18px]">
          <div className="mb-3.5 text-xs text-text-faint">
            For <span className="font-medium text-text-secondary">{account.displayName || account.email}</span> ({account.provider.toUpperCase()})
          </div>
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Emails per day</label>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
            autoFocus
            className="h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 font-mono text-sm text-text-primary outline-none focus:border-accent"
          />
          <p className="mt-2 text-[11px] leading-snug text-text-faint">
            Caps how many emails this app sends from this mailbox per day — Google's own sending limits
            still apply on top of it. Already sent today: {account.sentToday}.
          </p>
          {error && <div className="mt-3 text-xs text-danger">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <button
            onClick={onClose}
            className="h-[34px] rounded-md border border-border-subtle px-3.5 text-sm font-medium text-text-secondary hover:bg-raised"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
