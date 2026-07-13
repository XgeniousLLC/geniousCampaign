import { useState } from 'react';
import { changePassword } from '../lib/authApi';

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="text-lg font-semibold text-text-heading">Change password</h1>
        <p className="mt-1 text-xs text-text-muted">Update the password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md rounded-md border border-border-default bg-panel p-5">
        <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Current password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
        />

        <label className="mb-1.5 block text-xs font-semibold text-text-secondary">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
        />

        <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="mb-2 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
        />

        {error && <div className="mt-2 text-xs text-danger">{error}</div>}
        {success && <div className="mt-2 text-xs text-success">Password updated.</div>}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
