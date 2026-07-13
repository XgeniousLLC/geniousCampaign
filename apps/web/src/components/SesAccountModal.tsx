import { useState } from 'react';
import { createSesAccount, updateSenderAccount, type SenderAccount } from '../lib/senderAccountsApi';
import { CloseIcon } from './icons';

// Create or edit one named AWS SES sender account (GC-077). Per-account
// credentials are optional — left blank, sends against this account fall
// back to the global Settings > Integrations AWS_* values at send time
// (SesSenderProvider), so this form works whether the admin wants one more
// account under the same AWS setup or a genuinely separate AWS account.
export function SesAccountModal({ account, onClose, onSaved }: { account?: SenderAccount; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!account;
  const [email, setEmail] = useState(account?.email ?? '');
  const [displayName, setDisplayName] = useState(account?.displayName ?? '');
  const [dailySendLimit, setDailySendLimit] = useState(String(account?.dailySendLimit ?? 50000));
  const [awsRegion, setAwsRegion] = useState(account?.awsRegion ?? '');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [sesConfigurationSet, setSesConfigurationSet] = useState(account?.sesConfigurationSet ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!isEdit && !email.trim()) {
      setError('Email is required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        displayName: displayName.trim() || undefined,
        dailySendLimit: dailySendLimit ? Number(dailySendLimit) : undefined,
        awsRegion: awsRegion.trim() || undefined,
        awsAccessKeyId: awsAccessKeyId.trim() || undefined,
        awsSecretAccessKey: awsSecretAccessKey.trim() || undefined,
        sesConfigurationSet: sesConfigurationSet.trim() || undefined,
      };
      if (isEdit) {
        await updateSenderAccount(account.id, payload);
      } else {
        await createSesAccount({ email: email.trim(), ...payload });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="flex max-h-[84vh] w-[480px] max-w-full flex-col rounded-xl border border-border-modal bg-panel2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <h3 className="text-sm font-semibold text-text-heading">{isEdit ? 'Edit AWS SES account' : 'Add AWS SES account'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[18px]">
          {!isEdit && (
            <>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">From email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
                className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
              />
            </>
          )}

          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Marketing (US)"
            className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />

          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Daily send limit</label>
          <input
            type="number"
            value={dailySendLimit}
            onChange={(e) => setDailySendLimit(e.target.value)}
            className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 font-mono text-sm text-text-primary"
          />

          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-semibold text-text-secondary">AWS credentials (optional)</label>
            <span className="text-[10.5px] text-text-faint">blank = use Settings &gt; Integrations</span>
          </div>
          <input
            value={awsRegion}
            onChange={(e) => setAwsRegion(e.target.value)}
            placeholder="Region, e.g. us-east-1"
            className="mb-2 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />
          <input
            value={awsAccessKeyId}
            onChange={(e) => setAwsAccessKeyId(e.target.value)}
            placeholder="Access key ID"
            className="mb-2 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />
          <input
            type="password"
            value={awsSecretAccessKey}
            onChange={(e) => setAwsSecretAccessKey(e.target.value)}
            placeholder={isEdit ? 'Secret access key (leave blank to keep)' : 'Secret access key'}
            className="mb-2 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />
          <input
            value={sesConfigurationSet}
            onChange={(e) => setSesConfigurationSet(e.target.value)}
            placeholder="Configuration set (optional)"
            className="h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />

          {error && <div className="mt-3 text-xs text-danger">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <button onClick={onClose} className="h-[34px] rounded-md border border-border-subtle px-3.5 text-sm font-medium text-text-secondary hover:bg-raised">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add account'}
          </button>
        </div>
      </div>
    </div>
  );
}
