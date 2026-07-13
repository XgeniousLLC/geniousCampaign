import { useEffect, useState } from 'react';
import { listEmailLog, getEmailLogDetail, type EmailLogRow, type EmailLogDetail } from '../lib/emailLogApi';
import { listContacts, type Contact } from '../lib/contactsApi';
import type { SendStatus } from '../lib/campaignsApi';
import { PaginationBar } from '../components/PaginationBar';

const PAGE_SIZE = 50;

const STATUS_FILTERS: { label: string; value: SendStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Sent', value: 'sent' },
  { label: 'Bounced', value: 'bounced' },
  { label: 'Complained', value: 'complained' },
  { label: 'Suppressed', value: 'suppressed' },
  { label: 'Failed', value: 'failed' },
];

const STATUS_STYLES: Record<SendStatus, string> = {
  sent: 'text-success',
  failed: 'text-danger',
  suppressed: 'text-warning',
  bounced: 'text-danger',
  complained: 'text-danger',
};

export function EmailLog() {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filter, setFilter] = useState<SendStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<EmailLogDetail | null>(null);

  function load() {
    listEmailLog({ status: filter === 'all' ? undefined : filter, page, limit: PAGE_SIZE }).then((res) => {
      setRows(res.data);
      setTotal(res.total);
    });
  }

  useEffect(load, [filter, page]);
  useEffect(() => {
    listContacts().then(setContacts);
  }, []);

  const contactEmail = (contactId: string) => contacts.find((c) => c.id === contactId)?.email ?? contactId;

  const filteredRows = search.trim()
    ? rows.filter(
        (r) =>
          contactEmail(r.contactId).toLowerCase().includes(search.toLowerCase()) ||
          r.resolvedSubject.toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  async function openDetail(id: string) {
    setDetail(await getEmailLogDetail(id));
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-text-heading">Email Log</h1>
        <p className="mt-1 text-xs text-text-muted">Every individual send, with delivery and engagement events.</p>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipient or subject…"
          className="h-8 w-72 rounded-md border border-border-default bg-panel px-2.5 text-xs text-text-primary placeholder:text-text-faint"
        />
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className={`h-8 rounded-md border px-2.5 text-xs font-medium ${
                filter === f.value
                  ? 'border-accent/40 bg-accent/10 text-accent-light'
                  : 'border-border-default text-text-tertiary hover:bg-raised'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border-default bg-panel">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-default bg-surface text-[11px] uppercase tracking-wide text-text-meta">
              <th className="px-3 py-2 text-left font-medium">Time</th>
              <th className="px-3 py-2 text-left font-medium">Recipient</th>
              <th className="px-3 py-2 text-left font-medium">Subject</th>
              <th className="px-3 py-2 text-left font-medium">Sender</th>
              <th className="px-3 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr
                key={row.id}
                onClick={() => openDetail(row.id)}
                className="cursor-pointer border-t border-border-subtle hover:bg-raised"
              >
                <td className="px-3 py-2 font-mono text-[11px] text-text-faint">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-[11.5px] text-text-secondary">{contactEmail(row.contactId)}</td>
                <td className="max-w-[230px] truncate px-3 py-2 text-text-tertiary">{row.resolvedSubject}</td>
                <td className="px-3 py-2 font-mono text-[11.5px] text-text-faint">{row.provider}</td>
                <td className={`px-3 py-2 text-right font-medium ${STATUS_STYLES[row.status]}`}>{row.status}</td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                  No sends yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {search.trim() ? (
          <div className="flex items-center justify-between border-t border-border-subtle px-3.5 py-2 text-[11px] text-text-faint">
            <span>{filteredRows.length} matching this page's {rows.length} loaded rows — clear search to page through all {total}</span>
          </div>
        ) : (
          total > 0 && <PaginationBar page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setDetail(null)}>
          <div
            className="flex h-full w-[440px] max-w-full flex-col border-l border-border-modal bg-panel2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-text-heading">Message detail</h3>
                <span className={`text-xs font-semibold ${STATUS_STYLES[detail.send.status]}`}>{detail.send.status}</span>
              </div>
              <button onClick={() => setDetail(null)} className="text-text-muted hover:text-text-primary">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-meta">Fields</div>
              <div className="mb-5 flex flex-col gap-3">
                <Field label="Recipient" value={contactEmail(detail.send.contactId)} />
                <Field label="Subject" value={detail.send.resolvedSubject} />
                <Field label="Sender provider" value={detail.send.provider} />
                {detail.send.error && <Field label="Error" value={detail.send.error} />}
              </div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-meta">Resolved body</div>
              <div
                className="mb-5 max-h-52 overflow-y-auto rounded-md border border-border-subtle bg-surface p-3 text-xs text-text-secondary"
                dangerouslySetInnerHTML={{ __html: detail.send.resolvedBodyHtml }}
              />
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-meta">Delivery timeline</div>
              <div className="flex flex-col gap-1">
                {detail.events.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-light" />
                    <span className="flex-1 text-xs font-medium text-text-secondary">
                      {ev.type}
                      {ev.url && <span className="ml-1 text-text-faint">· {ev.url}</span>}
                    </span>
                    <span className="font-mono text-[11px] text-text-faint">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
                {detail.events.length === 0 && <div className="text-xs text-text-faint">No events yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11.5px] text-text-muted">{label}</span>
      <span className="break-all font-mono text-xs text-text-secondary">{value}</span>
    </div>
  );
}
