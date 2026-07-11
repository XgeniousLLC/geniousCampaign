import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listContacts, type Contact } from '../lib/contactsApi';
import { CsvImportModal } from '../components/CsvImportModal';

const STATUS_STYLES: Record<Contact['status'], string> = {
  active: 'bg-success/10 text-success border-success/25',
  unsubscribed: 'bg-text-muted/10 text-text-muted border-text-muted/25',
  bounced: 'bg-warning/10 text-warning border-warning/25',
  suppressed: 'bg-danger/10 text-danger border-danger/25',
};

function initials(contact: Contact): string {
  const first = contact.firstName?.[0] ?? contact.email[0];
  const last = contact.lastName?.[0] ?? '';
  return (first + last).toUpperCase();
}

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Contact['status'] | 'all'>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    listContacts()
      .then(setContacts)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!search) return true;
      const haystack = `${c.email} ${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [contacts, search, statusFilter]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: contacts.length };
    for (const c of contacts) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    return byStatus;
  }, [contacts]);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Contacts</h1>
          <p className="mt-1 text-xs text-text-muted">{contacts.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised"
          >
            Import CSV
          </button>
          <NewContactButton onCreated={reload} />
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name…"
          className="h-8 w-72 rounded-md border border-border-strong bg-field px-3 text-xs text-text-primary outline-none placeholder:text-text-faint"
        />
        <div className="flex gap-1">
          {(['all', 'active', 'unsubscribed', 'bounced', 'suppressed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-8 rounded-md px-2.5 text-xs font-medium ${
                statusFilter === s ? 'bg-raised2 text-text-primary' : 'text-text-muted hover:bg-raised'
              }`}
            >
              {s} <span className="text-text-faint">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border-default bg-panel">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-default bg-surface text-[11px] uppercase tracking-wide text-text-meta">
              <th className="px-3 py-2 text-left font-medium">Contact</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border-subtle hover:bg-raised">
                <td className="px-3 py-2">
                  <Link to={`/contacts/${c.id}`} className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent-light">
                      {initials(c)}
                    </span>
                    <span>
                      <span className="block font-medium text-text-secondary">
                        {c.firstName || c.lastName ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : c.email}
                      </span>
                      <span className="block font-mono text-[11px] text-text-faint">{c.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] ${STATUS_STYLES[c.status]}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-text-faint">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-text-muted">
                  No contacts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {importOpen && <CsvImportModal onClose={() => setImportOpen(false)} onImported={reload} />}
    </div>
  );
}

function NewContactButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      const { createContact } = await import('../lib/contactsApi');
      await createContact({ email, firstName: firstName || undefined });
      setOpen(false);
      setEmail('');
      setFirstName('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
      >
        Add contact
      </button>
      {open && (
        <div className="absolute top-9 right-0 z-20 w-64 rounded-md border border-border-modal bg-panel2 p-3 shadow-lg">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="mb-2 h-8 w-full rounded border border-border-default bg-field px-2 text-xs text-text-primary outline-none"
          />
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name (optional)"
            className="mb-2 h-8 w-full rounded border border-border-default bg-field px-2 text-xs text-text-primary outline-none"
          />
          {error && <div className="mb-2 text-[11px] text-danger">{error}</div>}
          <button onClick={submit} className="h-7 w-full rounded bg-accent text-xs font-semibold text-white hover:bg-accent-hover">
            Create
          </button>
        </div>
      )}
    </div>
  );
}
