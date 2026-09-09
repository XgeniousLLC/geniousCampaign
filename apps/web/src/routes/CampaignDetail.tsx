import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCampaign, getCampaignSends, sendCampaign, cancelCampaignSchedule, deleteCampaign, runCampaignForReal, type Campaign, type CampaignSend, type CampaignStatus } from '../lib/campaignsApi';
import { listContacts, avatarColor, type Contact } from '../lib/contactsApi';
import { listTemplates, type Template } from '../lib/templatesApi';
import { listLists, type List } from '../lib/contactsApi';
import { useAuthStore } from '../stores/useAuthStore';

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-text-muted/10 text-text-muted border-text-muted/25',
  sending: 'bg-info/10 text-info border-info/25',
  sent: 'bg-success/10 text-success border-success/25',
  failed: 'bg-danger/10 text-danger border-danger/25',
};

type RecipientTab = 'all' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

const RECIPIENTS_PAGE_SIZE = 20;

function pct(n: number, of: number): string {
  return of > 0 ? `${((n / of) * 100).toFixed(1)}%` : '0.0%';
}

// Same contact-cell conventions as ContactsList.tsx (initials/displayName) —
// kept in sync so a contact reads identically wherever it appears.
function initials(contact: Contact): string {
  const first = contact.firstName?.[0] ?? contact.email[0];
  const last = contact.lastName?.[0] ?? '';
  return (first + last).toUpperCase();
}

function displayName(contact: Contact): string {
  return contact.firstName || contact.lastName ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : contact.email;
}

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [campaignLists, setCampaignLists] = useState<List[]>([]);
  const [tab, setTab] = useState<RecipientTab>('all');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(RECIPIENTS_PAGE_SIZE);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ recipientCount: number; threshold: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  async function load() {
    if (!id) return;
    const [c, s, allContacts, allTemplates, allLists] = await Promise.all([
      getCampaign(id),
      getCampaignSends(id),
      listContacts(),
      listTemplates(),
      listLists(),
    ]);
    setCampaign(c);
    setSends(s);
    setContacts(allContacts);
    setTemplate(allTemplates.find((t) => t.id === c.templateId) ?? null);
    setCampaignLists(allLists.filter((l) => (c.listIds ?? []).includes(l.id)));
  }

  useEffect(() => {
    load();
    // A sending campaign updates asynchronously via BullMQ — poll briefly so
    // the screen reflects real progress without a manual refresh.
    const interval = setInterval(() => {
      if (campaign?.status === 'sending' || campaign?.status === 'draft') load();
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, campaign?.status]);

  const contact = (contactId: string) => contacts.find((c) => c.id === contactId);

  async function handleSendNow(confirmed = false) {
    if (!id) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const result = await sendCampaign(id, confirmed);
      if (result.status === 'confirmation_required') {
        setPendingConfirm({ recipientCount: result.recipientCount!, threshold: result.threshold! });
        setActionBusy(false);
        return;
      }
      setPendingConfirm(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!id || !campaign) return;
    if (!confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteCampaign(id);
      navigate('/campaigns');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed.');
      setDeleting(false);
    }
  }

  async function handleRunForReal() {
    if (!id) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const created = await runCampaignForReal(id);
      navigate(`/campaigns/${created.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancelSchedule() {
    if (!id) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await cancelCampaignSchedule(id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  }

  const stats = useMemo(() => {
    const total = sends.length;
    // "Delivered" here (used by the KPI card + ratio stats below) means
    // "handed off to the provider" (status 'sent') — distinct from
    // deliveredConfirmed, the SES-webhook-confirmed 'delivered' status used
    // by the recipient filter tabs.
    const delivered = sends.filter((s) => s.status === 'sent').length;
    const deliveredConfirmed = sends.filter((s) => s.status === 'delivered').length;
    const opened = sends.filter((s) => s.opened).length;
    const clicked = sends.filter((s) => s.clicked).length;
    const bounced = sends.filter((s) => s.status === 'bounced').length;
    const failed = sends.filter((s) => s.status === 'failed').length;
    return { total, delivered, deliveredConfirmed, opened, clicked, bounced, failed };
  }, [sends]);

  const dominantProvider = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sends) counts.set(s.provider, (counts.get(s.provider) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [sends]);

  const filteredSends = useMemo(() => {
    let result = sends;
    if (tab === 'sent') result = result.filter((s) => s.status === 'sent');
    else if (tab === 'delivered') result = result.filter((s) => s.status === 'delivered');
    else if (tab === 'opened') result = result.filter((s) => s.opened);
    else if (tab === 'clicked') result = result.filter((s) => s.clicked);
    else if (tab === 'bounced') result = result.filter((s) => s.status === 'bounced');
    else if (tab === 'failed') result = result.filter((s) => s.status === 'failed');

    const query = recipientSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((s) => {
        const c = contact(s.contactId);
        const email = c?.email ?? s.contactId;
        const name = c ? displayName(c) : '';
        return email.toLowerCase().includes(query) || name.toLowerCase().includes(query);
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sends, tab, recipientSearch, contacts]);

  if (!campaign) {
    return (
      <div className="animate-pulse">
        <div className="mb-3 h-3 w-24 rounded bg-surface" />
        <div className="mb-1 flex items-center gap-2.5">
          <div className="h-5 w-48 rounded bg-surface" />
          <div className="h-5 w-16 rounded-full bg-surface" />
        </div>
        <div className="mb-5 h-3 w-64 rounded bg-surface" />

        <div className="grid max-w-[820px] grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="rounded-md border border-border-default bg-panel p-3.5">
              <div className="h-3 w-14 rounded bg-surface" />
              <div className="mt-2.5 h-6 w-10 rounded bg-surface" />
              <div className="mt-2 h-2.5 w-10 rounded bg-surface" />
            </div>
          ))}
        </div>

        <div className="mt-3 grid max-w-[820px] grid-cols-2 gap-3">
          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="mb-3.5 h-3.5 w-32 rounded bg-surface" />
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-8 rounded bg-surface" />
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="mb-3.5 h-3.5 w-24 rounded bg-surface" />
            <div className="grid grid-cols-2 gap-3.5">
              {[0, 1, 2, 3].map((n) => (
                <div key={n}>
                  <div className="h-3 w-16 rounded bg-surface" />
                  <div className="mt-1.5 h-4 w-12 rounded bg-surface" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-5 border-b border-border-default pb-2.5">
          <div className="h-4 w-8 rounded bg-surface" />
          <div className="h-4 w-14 rounded bg-surface" />
          <div className="h-4 w-14 rounded bg-surface" />
          <div className="h-4 w-16 rounded bg-surface" />
        </div>
        <div className="mt-4 overflow-hidden rounded-md border border-border-default bg-panel">
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-3 border-t border-border-subtle p-3 first:border-t-0">
              <div className="h-7 w-7 shrink-0 rounded-full bg-surface" />
              <div className="flex-1">
                <div className="h-3 w-40 rounded bg-surface" />
                <div className="mt-1.5 h-2.5 w-28 rounded bg-surface" />
              </div>
              <div className="h-4 w-16 rounded bg-surface" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const funnel = [
    { label: 'Delivered', value: stats.delivered, pctLabel: pct(stats.delivered, stats.total), pct: stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0, color: '#818CF8' },
    { label: 'Opened', value: stats.opened, pctLabel: pct(stats.opened, stats.delivered), pct: stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0, color: '#34D399' },
    { label: 'Clicked', value: stats.clicked, pctLabel: pct(stats.clicked, stats.delivered), pct: stats.delivered > 0 ? (stats.clicked / stats.delivered) * 100 : 0, color: '#FBBF24' },
  ];

  const ratios = [
    { label: 'Open rate', value: pct(stats.opened, stats.delivered), sub: `${stats.opened} of ${stats.delivered} delivered` },
    { label: 'Click rate', value: pct(stats.clicked, stats.delivered), sub: `${stats.clicked} of ${stats.delivered} delivered` },
    { label: 'Click-to-open', value: pct(stats.clicked, stats.opened), sub: `${stats.clicked} of ${stats.opened} opened` },
    { label: 'Bounce rate', value: pct(stats.bounced, stats.total), sub: `${stats.bounced} of ${stats.total} sent` },
  ];

  const tabs: { key: RecipientTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'sent', label: 'Sent', count: stats.delivered },
    { key: 'delivered', label: 'Delivered', count: stats.deliveredConfirmed },
    { key: 'opened', label: 'Opened', count: stats.opened },
    { key: 'clicked', label: 'Clicked', count: stats.clicked },
    { key: 'bounced', label: 'Bounced', count: stats.bounced },
    { key: 'failed', label: 'Failed', count: stats.failed },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => navigate('/campaigns')} className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary">
          ← Campaigns
        </button>
        {canWrite && campaign.status !== 'sending' && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="h-7 rounded-md border border-danger/25 px-2.5 text-[11px] font-medium text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete campaign'}
          </button>
        )}
      </div>
      <div className="mb-1 flex items-center gap-2.5">
        <h1 className="text-lg font-semibold text-text-heading">{campaign.name}</h1>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[campaign.status]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {campaign.status}
        </span>
        {campaign.status === 'draft' && campaign.scheduledAt && (
          <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-tint">
            scheduled
          </span>
        )}
        {campaign.isDryRun && (
          <span className="inline-flex items-center rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
            dry run
          </span>
        )}
        {campaign.sendToEmail && (
          <span className="inline-flex items-center rounded-full border border-info/25 bg-info/10 px-2 py-0.5 text-[11px] font-semibold text-info">
            send-to-self: {campaign.sendToEmail}
          </span>
        )}
      </div>
      <p className="mb-5 text-xs text-text-muted">
        {new Date(campaign.createdAt).toLocaleDateString()} · {template?.name ?? '—'} · {stats.total} recipients
        {dominantProvider && <> · via {dominantProvider.toUpperCase()}</>}
        {campaignLists.length > 0 && <> · {campaignLists.map((l) => l.name).join(', ')}</>}
        {campaign.fromName && <> · from "{campaign.fromName}"</>}
        {campaign.replyTo && <> · reply-to {campaign.replyTo}</>}
      </p>

      {campaign.status === 'draft' && (
        <div className="mb-4 flex max-w-[820px] items-center gap-2.5 rounded-md border border-border-default bg-panel px-3.5 py-2.5">
          <div className="flex-1 text-xs text-text-secondary">
            {campaign.scheduledAt ? `Scheduled for ${new Date(campaign.scheduledAt).toLocaleString()}` : 'Draft — not sent yet.'}
          </div>
          {actionError && <div className="text-[11px] text-danger">{actionError}</div>}
          {pendingConfirm && (
            <label className="flex items-center gap-1.5 text-[11px] text-warning">
              <input type="checkbox" onChange={() => handleSendNow(true)} />
              {pendingConfirm.recipientCount} recipients, over {pendingConfirm.threshold} — confirm send
            </label>
          )}
          {campaign.scheduledAt && (
            <button
              onClick={handleCancelSchedule}
              disabled={actionBusy}
              className="h-8 rounded-md border border-border-subtle px-3 text-xs font-medium text-text-secondary hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel schedule
            </button>
          )}
          <button
            onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
            disabled={actionBusy}
            className="h-8 rounded-md border border-border-subtle px-3 text-xs font-medium text-text-secondary hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={() => handleSendNow(false)}
            disabled={actionBusy || !!pendingConfirm}
            className="h-8 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionBusy ? 'Sending…' : 'Send now'}
          </button>
        </div>
      )}

      {canWrite && campaign.isDryRun && (campaign.status === 'sent' || campaign.status === 'failed') && (
        <div className="mb-4 flex max-w-[820px] items-center gap-2.5 rounded-md border border-warning/25 bg-warning/10 px-3.5 py-2.5">
          <div className="flex-1 text-xs text-text-secondary">
            This was a dry run — no real email was sent. Run it for real to send to the same audience.
          </div>
          {actionError && <div className="text-[11px] text-danger">{actionError}</div>}
          <button
            onClick={handleRunForReal}
            disabled={actionBusy}
            className="h-8 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionBusy ? 'Creating…' : 'Run for real'}
          </button>
        </div>
      )}

      <div className="grid max-w-[820px] grid-cols-4 gap-3">
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Delivered</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{stats.delivered}</div>
          <div className="mt-1 text-[11px] text-success">{pct(stats.delivered, stats.total)}</div>
        </div>
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Opens</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{stats.opened}</div>
          <div className="mt-1 text-[11px] text-accent-light">{pct(stats.opened, stats.delivered)}</div>
        </div>
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Clicks</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{stats.clicked}</div>
          <div className="mt-1 text-[11px] text-success">{pct(stats.clicked, stats.delivered)}</div>
        </div>
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Bounces</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{stats.bounced}</div>
          <div className="mt-1 text-[11px] text-warning">{pct(stats.bounced, stats.total)}</div>
        </div>
      </div>

      <div className="mt-3 grid max-w-[820px] grid-cols-2 gap-3">
        <div className="rounded-md border border-border-default bg-panel p-4">
          <div className="mb-3.5 text-sm font-semibold text-text-primary">Engagement funnel</div>
          <div className="flex flex-col gap-3">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">{f.label}</span>
                  <span className="text-xs font-medium text-text-secondary">
                    <span className="font-mono">{f.value}</span> · {f.pctLabel}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border-subtle">
                  <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border-default bg-panel p-4">
          <div className="mb-3.5 text-sm font-semibold text-text-primary">Ratio stats</div>
          <div className="grid grid-cols-2 gap-3.5">
            {ratios.map((r) => (
              <div key={r.label}>
                <div className="text-xs text-text-muted">{r.label}</div>
                <div className="mt-0.5 font-mono text-xl font-semibold leading-none text-text-heading">{r.value}</div>
                <div className="mt-1 text-[11px] text-text-faint">{r.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 max-w-[820px]">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <input
            value={recipientSearch}
            onChange={(e) => {
              setRecipientSearch(e.target.value);
              setVisibleCount(RECIPIENTS_PAGE_SIZE);
            }}
            placeholder="Search by name or email…"
            className="h-8 w-56 rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary placeholder:text-text-faint"
          />
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setVisibleCount(RECIPIENTS_PAGE_SIZE);
                }}
                className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
                  tab === t.key ? 'border-accent/30 bg-accent/10 text-accent-tint' : 'border-border-strong bg-field text-text-quaternary hover:bg-raised'
                }`}
              >
                {t.label}
                <span className={`font-mono text-[11px] ${tab === t.key ? 'text-accent-light' : 'text-text-meta'}`}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          {filteredSends.slice(0, visibleCount).map((s) => {
            const c = contact(s.contactId);
            const detail = s.status === 'bounced' ? 'Bounced' : s.clicked ? 'Clicked' : s.opened ? 'Opened' : s.status;
            return (
              <div key={s.id} className="flex items-center gap-2.5 border-t border-border-subtle px-3.5 py-2.5 first:border-t-0 hover:bg-raised">
                {c ? (
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
                ) : (
                  <div className="min-w-0 flex-1 truncate font-mono text-xs text-text-secondary">{s.contactId}</div>
                )}
                <div className="text-xs text-text-tertiary">{detail}</div>
                {s.error && <div className="max-w-xs truncate text-[11px] text-text-faint" title={s.error}>{s.error}</div>}
                <div className="w-24 text-right text-[11px] text-text-faint">{s.sentAt ? new Date(s.sentAt).toLocaleTimeString() : '—'}</div>
              </div>
            );
          })}
          {filteredSends.length === 0 && (
            <div className="px-3.5 py-8 text-center text-xs text-text-muted">
              {recipientSearch.trim() ? `No recipients match "${recipientSearch.trim()}".` : 'No recipients in this view.'}
            </div>
          )}
        </div>
        {filteredSends.length > visibleCount && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => setVisibleCount((v) => v + RECIPIENTS_PAGE_SIZE)}
              className="h-8 rounded-md border border-border-subtle px-3.5 text-xs font-medium text-text-secondary hover:bg-raised"
            >
              Load more ({filteredSends.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
