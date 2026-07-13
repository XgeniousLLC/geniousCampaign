import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addContactList,
  avatarColor,
  deleteContact,
  bulkDeleteContacts,
  getList,
  listContacts,
  listLists,
  type Contact,
  type List,
} from '../lib/contactsApi';
import { listSequences, type Sequence } from '../lib/sequencesApi';
import { enrollContact } from '../lib/enrollmentsApi';
import { localCheckEmail, verifyEmail } from '../lib/verificationApi';
import { manualSuppress } from '../lib/suppressionApi';
import { CsvImportModal } from '../components/CsvImportModal';
import { SpinnerIcon } from '../components/icons';

const STATUS_STYLES: Record<Contact['status'], string> = {
  active: 'bg-success/10 text-success border-success/25',
  unsubscribed: 'bg-text-muted/10 text-text-muted border-text-muted/25',
  bounced: 'bg-warning/10 text-warning border-warning/25',
  suppressed: 'bg-danger/10 text-danger border-danger/25',
};

const PAGE_SIZE = 25;

type SortKey = 'name' | 'status' | 'lastActivityAt';
type SortDir = 'asc' | 'desc';

function initials(contact: Contact): string {
  const first = contact.firstName?.[0] ?? contact.email[0];
  const last = contact.lastName?.[0] ?? '';
  return (first + last).toUpperCase();
}

function displayName(c: Contact): string {
  return c.firstName || c.lastName ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : c.email;
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ContactsList({ listId }: { listId?: string } = {}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scopeList, setScopeList] = useState<List | null>(null);
  const [allLists, setAllLists] = useState<List[]>([]);
  const [allSequences, setAllSequences] = useState<Sequence[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Contact['status'] | 'all'>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<'list' | 'sequence' | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const noticeTimeout = useRef<number | null>(null);

  function toast(text: string, tone: 'success' | 'error' | 'info' = 'info') {
    setNotice({ text, tone });
    if (noticeTimeout.current) window.clearTimeout(noticeTimeout.current);
    noticeTimeout.current = window.setTimeout(() => setNotice(null), 5000);
  }

  function reload() {
    setLoading(true);
    listContacts()
      .then(setContacts)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);
  useEffect(() => {
    listLists().then(setAllLists);
    listSequences().then(setAllSequences);
  }, []);
  useEffect(() => {
    if (!listId) {
      setScopeList(null);
      return;
    }
    getList(listId).then(setScopeList);
  }, [listId]);

  const scopedContacts = useMemo(
    () => (listId ? contacts.filter((c) => (c.lists ?? []).some((l) => l.id === listId)) : contacts),
    [contacts, listId],
  );

  const filtered = useMemo(() => {
    const rows = scopedContacts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!search) return true;
      const haystack = `${c.email} ${c.firstName ?? ''} ${c.lastName ?? ''} ${(c.tags ?? []).map((t) => t.name).join(' ')}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
    if (!sortKey) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === 'name') return displayName(a).localeCompare(displayName(b)) * dir;
      if (sortKey === 'status') return a.status.localeCompare(b.status) * dir;
      const av = a.lastActivityAt ?? '';
      const bv = b.lastActivityAt ?? '';
      return av.localeCompare(bv) * dir;
    });
  }, [scopedContacts, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, statusFilter, listId]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: scopedContacts.length };
    for (const c of scopedContacts) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    return byStatus;
  }, [scopedContacts]);

  const verifiedCount = scopedContacts.filter((c) => c.verificationStatus === 'valid').length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    const pageIds = pageRows.map((c) => c.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    setSelected((s) => {
      const next = new Set(s);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function runBulkAddToList(listId: string) {
    setBusy(true);
    setPickerOpen(null);
    await Promise.all([...selected].map((id) => addContactList(listId, id)));
    toast(`Added ${selected.size} contact(s) to the list.`, 'success');
    setSelected(new Set());
    setBusy(false);
    reload();
  }

  async function runBulkEnroll(sequenceId: string) {
    setBusy(true);
    setPickerOpen(null);
    let ok = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await enrollContact(sequenceId, id);
        ok++;
      } catch {
        failed++;
      }
    }
    toast(`Enrolled ${ok} contact(s)${failed ? `, ${failed} failed (already enrolled?)` : ''}.`, failed ? 'info' : 'success');
    setSelected(new Set());
    setBusy(false);
  }

  async function runBulkVerify() {
    setBusy(true);
    const targets = contacts.filter((c) => selected.has(c.id));
    let valid = 0;
    for (const c of targets) {
      const result = await localCheckEmail(c.email);
      if (result.valid) valid++;
    }
    toast(`Local check: ${valid} of ${targets.length} passed syntax/MX check (not a paid deliverability verification).`, 'info');
    setSelected(new Set());
    setBusy(false);
  }

  async function runBulkSuppress() {
    setBusy(true);
    await Promise.all([...selected].map((id) => manualSuppress(id)));
    toast(`Suppressed ${selected.size} contact(s).`, 'success');
    setSelected(new Set());
    setBusy(false);
    reload();
  }

  async function runBulkDelete() {
    setBusy(true);
    setConfirmBulkDelete(false);
    const count = selected.size;
    try {
      await bulkDeleteContacts([...selected]);
      toast(`Deleted ${count} contact(s).`, 'success');
      setSelected(new Set());
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk delete failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setOpenMenuId(null);
    await deleteContact(id);
    reload();
  }

  const VERIFY_TOAST: Record<Contact['verificationStatus'] & string, { text: string; tone: 'success' | 'error' | 'info' }> = {
    valid: { text: 'Verified — deliverable.', tone: 'success' },
    invalid: { text: 'Verified — not deliverable.', tone: 'error' },
    risky: { text: 'Verified — risky (catch-all domain).', tone: 'info' },
    unknown: { text: 'Verification came back inconclusive.', tone: 'info' },
  };

  async function handleVerify(c: Contact) {
    if (verifyingIds.has(c.id)) return;
    setVerifyingIds((s) => new Set(s).add(c.id));
    try {
      const result = await verifyEmail(c.email);
      setContacts((cs) => cs.map((x) => (x.id === c.id ? { ...x, verificationStatus: result.status } : x)));
      const t = VERIFY_TOAST[result.status] ?? { text: `Verified: ${result.status}.`, tone: 'info' as const };
      toast(t.text, t.tone);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Verification failed.', 'error');
    } finally {
      setVerifyingIds((s) => {
        const next = new Set(s);
        next.delete(c.id);
        return next;
      });
    }
  }

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((c) => selected.has(c.id));

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          {listId && (
            <Link to="/lists" className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-text-faint hover:text-text-secondary">
              ← Lists &amp; Tags
            </Link>
          )}
          <h1 className="text-lg font-semibold text-text-heading">{listId ? (scopeList?.name ?? 'List') : 'Contacts'}</h1>
          <p className="mt-1 text-xs text-text-muted">
            {listId ? (
              <>
                {scopedContacts.length} member{scopedContacts.length === 1 ? '' : 's'}
                {scopeList && <> · {scopeList.type} list</>}
              </>
            ) : (
              <>
                {contacts.length} total · {verifiedCount} verified · {counts.suppressed ?? 0} suppressed
              </>
            )}
          </p>
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

      {notice && (
        <div
          className={`mb-3 flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
            notice.tone === 'success'
              ? 'border-success/25 bg-success/10 text-success'
              : notice.tone === 'error'
                ? 'border-danger/25 bg-danger/10 text-danger'
                : 'border-border-strong bg-panel text-text-secondary'
          }`}
        >
          {notice.text}
          <button
            onClick={() => setNotice(null)}
            className={notice.tone === 'success' ? 'text-success/70 hover:text-success' : notice.tone === 'error' ? 'text-danger/70 hover:text-danger' : 'text-text-faint hover:text-text-primary'}
          >
            Dismiss
          </button>
        </div>
      )}

      {!loading && scopedContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-emphasis bg-panel px-5 py-16 text-center">
          <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-border-strong bg-raised2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
          </div>
          <h3 className="mb-1.5 text-base font-semibold text-text-primary">No contacts yet</h3>
          <p className="mb-4 max-w-[360px] text-[13px] leading-relaxed text-text-muted">
            Import a CSV of your outreach list, or add contacts one at a time.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="h-[34px] rounded-md bg-accent px-3.5 text-[13px] font-semibold text-white hover:bg-accent-hover"
            >
              Import CSV
            </button>
            <NewContactButton onCreated={reload} label="Add manually" />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, name, or tag…"
              className="h-8 w-72 rounded-md border border-border-strong bg-field px-3 text-xs text-text-primary outline-none placeholder:text-text-faint"
            />
            <div className="flex gap-1.5">
              {(['all', 'active', 'unsubscribed', 'bounced', 'suppressed'] as const).map((s) => {
                const on = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium capitalize ${
                      on
                        ? 'border-accent/30 bg-accent/10 text-accent-tint'
                        : 'border-border-strong bg-field text-text-quaternary hover:bg-raised'
                    }`}
                  >
                    {s}
                    <span className={`font-mono text-[11px] ${on ? 'text-accent-light' : 'text-text-meta'}`}>{counts[s] ?? 0}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex-1" />
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-quaternary">{selected.size} selected</span>
                <div className="relative">
                  <button
                    disabled={busy}
                    onClick={() => setPickerOpen((p) => (p === 'list' ? null : 'list'))}
                    className="h-[30px] rounded-md border border-border-strong bg-field px-2.5 text-xs text-text-tertiary hover:bg-raised disabled:opacity-50"
                  >
                    Add to list
                  </button>
                  {pickerOpen === 'list' && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(null)} />
                      <div className="absolute right-0 top-8 z-20 w-52 overflow-hidden rounded-lg border border-border-modal bg-panel2 py-1 shadow-lg">
                        {allLists.length === 0 && <div className="px-3 py-2 text-xs text-text-faint">No lists yet.</div>}
                        {allLists.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => runBulkAddToList(l.id)}
                            className="block w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-raised hover:text-text-primary"
                          >
                            {l.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="relative">
                  <button
                    disabled={busy}
                    onClick={() => setPickerOpen((p) => (p === 'sequence' ? null : 'sequence'))}
                    className="h-[30px] rounded-md border border-border-strong bg-field px-2.5 text-xs text-text-tertiary hover:bg-raised disabled:opacity-50"
                  >
                    Enroll
                  </button>
                  {pickerOpen === 'sequence' && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(null)} />
                      <div className="absolute right-0 top-8 z-20 w-52 overflow-hidden rounded-lg border border-border-modal bg-panel2 py-1 shadow-lg">
                        {allSequences.length === 0 && <div className="px-3 py-2 text-xs text-text-faint">No sequences yet.</div>}
                        {allSequences.map((seq) => (
                          <button
                            key={seq.id}
                            onClick={() => runBulkEnroll(seq.id)}
                            className="block w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-raised hover:text-text-primary"
                          >
                            {seq.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  disabled={busy}
                  onClick={runBulkVerify}
                  className="flex h-[30px] items-center gap-1.5 rounded-md border border-success/25 bg-success/10 px-2.5 text-xs font-medium text-success disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  disabled={busy}
                  onClick={runBulkSuppress}
                  className="h-[30px] rounded-md border border-danger/25 bg-danger/10 px-2.5 text-xs text-danger disabled:opacity-50"
                >
                  Suppress
                </button>
                <button
                  disabled={busy}
                  onClick={() => setConfirmBulkDelete(true)}
                  className="h-[30px] rounded-md border border-danger/40 bg-danger/20 px-2.5 text-xs font-semibold text-danger disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-border-default bg-panel">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-default bg-surface text-[11px] uppercase tracking-wide text-text-meta">
                  <th className="w-9 py-2 pl-3.5">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} className="h-3.5 w-3.5 accent-accent" />
                  </th>
                  <th className="cursor-pointer select-none px-3 py-2 text-left font-medium" onClick={() => toggleSort('name')}>
                    Contact {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Tags</th>
                  <th className="px-3 py-2 text-left font-medium">Lists</th>
                  <th className="cursor-pointer select-none px-3 py-2 text-left font-medium" onClick={() => toggleSort('status')}>
                    Status {sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="cursor-pointer select-none px-3 py-2 text-right font-medium"
                    onClick={() => toggleSort('lastActivityAt')}
                  >
                    Last activity {sortKey === 'lastActivityAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="w-9" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr key={c.id} className="border-t border-border-subtle hover:bg-raised">
                    <td className="py-2 pl-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleRow(c.id)} className="h-3.5 w-3.5 accent-accent" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <Link to={`/contacts/${c.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                            style={{ background: avatarColor(c.id) }}
                          >
                            {initials(c)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-text-secondary">{displayName(c)}</span>
                            <span className="block truncate font-mono text-[11px] text-text-faint">{c.email}</span>
                          </span>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVerify(c);
                          }}
                          disabled={verifyingIds.has(c.id)}
                          title={
                            verifyingIds.has(c.id)
                              ? 'Verifying…'
                              : c.verificationStatus === 'valid'
                                ? 'Verified deliverable'
                                : c.verificationStatus === 'invalid'
                                  ? 'Verified — not deliverable, click to re-check'
                                  : c.verificationStatus === 'risky'
                                    ? 'Verified — risky (catch-all), click to re-check'
                                    : 'Not verified — click to verify'
                          }
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full disabled:opacity-70 ${
                            c.verificationStatus === 'valid'
                              ? 'text-success'
                              : c.verificationStatus === 'invalid'
                                ? 'text-danger'
                                : c.verificationStatus === 'risky'
                                  ? 'text-warning'
                                  : 'text-text-meta hover:text-text-tertiary'
                          }`}
                        >
                          {verifyingIds.has(c.id) ? (
                            <SpinnerIcon />
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <path d="m9 11 3 3L22 4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).map((t) => (
                          <span
                            key={t.id}
                            className="rounded-sm border px-1.5 py-0.5 text-[11px] font-medium"
                            style={{ backgroundColor: `${t.color}1F`, borderColor: `${t.color}4D`, color: t.color }}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-text-quaternary">{(c.lists ?? []).map((l) => l.name).join(', ') || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] capitalize ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-text-muted">{relativeTime(c.lastActivityAt)}</td>
                    <td className="relative px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenuId((m) => (m === c.id ? null : c.id))}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-text-meta hover:bg-raised2 hover:text-text-tertiary"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="1.6" />
                          <circle cx="12" cy="12" r="1.6" />
                          <circle cx="12" cy="19" r="1.6" />
                        </svg>
                      </button>
                      {openMenuId === c.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-2 top-8 z-20 w-36 overflow-hidden rounded-lg border border-border-modal bg-panel2 py-1 text-left shadow-lg">
                            <Link
                              to={`/contacts/${c.id}`}
                              className="block px-3 py-2 text-xs text-text-secondary hover:bg-raised hover:text-text-primary"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => manualSuppress(c.id).then(reload).then(() => setOpenMenuId(null))}
                              className="block w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-raised hover:text-text-primary"
                            >
                              Suppress
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="block w-full px-3 py-2 text-left text-xs text-danger hover:bg-raised"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                      No contacts match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-border-subtle px-3.5 py-2.5 text-xs text-text-meta">
              <span>
                Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-7 rounded-md border border-border-strong bg-field px-2.5 text-xs text-text-tertiary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 rounded-md border border-border-strong bg-field px-2.5 text-xs text-text-tertiary hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {importOpen && <CsvImportModal onClose={() => setImportOpen(false)} onImported={reload} />}

      {confirmBulkDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6" onClick={() => setConfirmBulkDelete(false)}>
          <div className="w-[400px] max-w-full rounded-xl border border-border-modal bg-panel2 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-sm font-semibold text-text-heading">Delete {selected.size} contact(s)?</h3>
            <p className="mb-4 text-xs text-text-muted">
              This permanently deletes these contacts and all their sends, list/tag memberships, and sequence enrollments. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                className="h-8 rounded-md border border-border-subtle px-3.5 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Cancel
              </button>
              <button
                onClick={runBulkDelete}
                disabled={busy}
                className="h-8 rounded-md bg-danger px-3.5 text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ListDetail() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ContactsList listId={id} />;
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="h-8 w-full rounded border border-border-default bg-field px-2 text-xs text-text-primary outline-none placeholder:text-text-faint focus:border-border-emphasis"
      />
    </label>
  );
}

function NewContactButton({ onCreated, label = 'Add contact' }: { onCreated: () => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setWebsite('');
    setError(null);
  }

  async function submit() {
    setError(null);
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setSaving(true);
    try {
      const { createContact } = await import('../lib/contactsApi');
      const customFields: Record<string, string> = {};
      if (phone.trim()) customFields.phone = phone.trim();
      if (website.trim()) customFields.website = website.trim();
      await createContact({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        customFields: Object.keys(customFields).length ? customFields : undefined,
      });
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-[420px] rounded-lg border border-border-modal bg-panel2 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-sm font-semibold text-text-primary">Add contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First name" value={firstName} onChange={setFirstName} placeholder="Amelia" />
              <FormField label="Last name" value={lastName} onChange={setLastName} placeholder="Chen" />
            </div>
            <div className="mt-3">
              <FormField label="Email" value={email} onChange={setEmail} placeholder="amelia.chen@example.com" type="email" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <FormField label="Phone" value={phone} onChange={setPhone} placeholder="+1 555 0100" type="tel" />
              <FormField label="Website" value={website} onChange={setWebsite} placeholder="acme.com" />
            </div>
            {error && <div className="mt-3 text-[11px] text-danger">{error}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="h-8 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="h-8 rounded-md bg-accent px-3.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
