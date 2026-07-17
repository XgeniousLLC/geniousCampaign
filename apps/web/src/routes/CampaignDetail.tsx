import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCampaign, getCampaignSends, sendCampaign, cancelCampaignSchedule, type Campaign, type CampaignSend, type CampaignStatus } from '../lib/campaignsApi';
import { listContacts, avatarColor, type Contact } from '../lib/contactsApi';
import { listTemplates, type Template } from '../lib/templatesApi';
import { listLists, type List } from '../lib/contactsApi';

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-text-muted/10 text-text-muted border-text-muted/25',
  sending: 'bg-info/10 text-info border-info/25',
  sent: 'bg-success/10 text-success border-success/25',
  failed: 'bg-danger/10 text-danger border-danger/25',
};

type RecipientTab = 'all' | 'opened' | 'clicked' | 'bounced';

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
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ recipientCount: number; threshold: number } | null>(null);

  async function load() {
    if (!id) return;
    const [c, s, allContacts, allTemplates, allLists] = await Promise.all([
      getCampaign(id),
      getCampaignSends(id),
      listContacts(),
      listTemplates({ includeVariants: true }),
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
    const delivered = sends.filter((s) => s.status === 'sent').length;
    const opened = sends.filter((s) => s.opened).length;
    const clicked = sends.filter((s) => s.clicked).length;
    const bounced = sends.filter((s) => s.status === 'bounced').length;
    return { total, delivered, opened, clicked, bounced };
  }, [sends]);

  const dominantProvider = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sends) counts.set(s.provider, (counts.get(s.provider) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [sends]);

  const filteredSends = useMemo(() => {
    if (tab === 'opened') return sends.filter((s) => s.opened);
    if (tab === 'clicked') return sends.filter((s) => s.clicked);
    if (tab === 'bounced') return sends.filter((s) => s.status === 'bounced');
    return sends;
  }, [sends, tab]);

  if (!campaign) return null;

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
    { key: 'opened', label: 'Opened', count: stats.opened },
    { key: 'clicked', label: 'Clicked', count: stats.clicked },
    { key: 'bounced', label: 'Bounced', count: stats.bounced },
  ];

  return (
    <div>
      <button
        onClick={() => navigate('/campaigns')}
        className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary"
      >
        ← Campaigns
      </button>
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
        <div className="mb-3 flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
                tab === t.key ? 'border-accent/30 bg-accent/10 text-accent-tint' : 'border-border-strong bg-field text-text-quaternary hover:bg-raised'
              }`}
            >
              {t.label}
              <span className={`font-mono text-[11px] ${tab === t.key ? 'text-accent-light' : 'text-text-meta'}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          {filteredSends.map((s) => {
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
          {filteredSends.length === 0 && <div className="px-3.5 py-8 text-center text-xs text-text-muted">No recipients in this view.</div>}
        </div>
      </div>
    </div>
  );
}
