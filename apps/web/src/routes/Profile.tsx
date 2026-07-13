import { useEffect, useState } from 'react';
import { getMe, updateProfile, type Me } from '../lib/authApi';
import { useAuthStore } from '../stores/useAuthStore';

const ROLE_STYLES: Record<Me['role'], string> = {
  owner: 'border-accent/25 bg-accent/10 text-accent-light',
  editor: 'border-info/25 bg-info/10 text-info',
  viewer: 'border-text-muted/25 bg-text-muted/10 text-text-muted',
};

export function Profile() {
  const [me, setMe] = useState<Me | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    getMe().then((m) => {
      setMe(m);
      setName(m.name ?? '');
      setEmail(m.email);
    });
  }, []);

  function startEditing() {
    if (!me) return;
    setName(me.name ?? '');
    setEmail(me.email);
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await updateProfile({ name: name.trim(), email: email.trim() });
      setMe(updated);
      setEditing(false);
      if (token) setSession(token, { id: updated.id, email: updated.email, role: updated.role, name: updated.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const initials = me ? (me.name || me.email).slice(0, 2).toUpperCase() : '??';

  return (
    <div>
      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Profile</h1>
          <p className="mt-1 text-xs text-text-muted">Your account details.</p>
        </div>
        {me && !editing && (
          <button
            onClick={startEditing}
            className="h-8 rounded-md border border-border-default bg-panel px-3 text-xs font-medium text-text-secondary hover:bg-raised"
          >
            Edit profile
          </button>
        )}
      </div>

      {me && !editing && (
        <div className="max-w-md rounded-md border border-border-default bg-panel p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-info-alt to-accent text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text-primary">{me.name || me.email}</div>
              {me.name && <div className="truncate text-xs text-text-muted">{me.email}</div>}
              <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${ROLE_STYLES[me.role]}`}>
                {me.role}
              </span>
            </div>
          </div>
          <div className="border-t border-border-subtle pt-3 text-xs text-text-muted">
            Member since {new Date(me.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      )}

      {me && editing && (
        <div className="max-w-md rounded-md border border-border-default bg-panel p-5">
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mb-3.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />

          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-2 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
          />

          {error && <div className="mt-2 text-xs text-danger">{error}</div>}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="h-[34px] rounded-md border border-border-subtle px-3.5 text-sm font-medium text-text-secondary hover:bg-raised"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
