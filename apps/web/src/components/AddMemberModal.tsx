import { useState } from 'react';
import { createUser, type User } from '../lib/usersApi';
import { CloseIcon } from './icons';

// Owner-only member creation (GC-082) — no email invite is sent (internal
// tool, invariant 11): the owner sets an initial password directly here and
// shares it with the new member out of band.
export function AddMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createUser({ email: email.trim(), password, role, name: name.trim() || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="flex w-[420px] max-w-full flex-col rounded-xl border border-border-modal bg-panel2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <h3 className="text-sm font-semibold text-text-heading">Add member</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 p-[18px]">
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />

          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@yourdomain.com"
            className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />

          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Initial password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />
          <p className="-mt-2.5 mb-3.5 text-[10.5px] text-text-faint">Share this password with the new member yourself — no invite email is sent.</p>

          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as User['role'])}
            className="h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
          >
            <option value="owner">owner</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>

          {error && <div className="mt-3 text-xs text-danger">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <button onClick={onClose} className="h-[34px] rounded-md border border-border-subtle px-3.5 text-sm font-medium text-text-secondary hover:bg-raised">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add member'}
          </button>
        </div>
      </div>
    </div>
  );
}
