import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCampaign, getCampaignSends, type Campaign, type CampaignSend, type CampaignStatus, type SendStatus } from '../lib/campaignsApi';
import { listContacts, type Contact } from '../lib/contactsApi';
import { listTemplates, type Template } from '../lib/templatesApi';
import { listLists, type List } from '../lib/contactsApi';

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-text-muted/10 text-text-muted border-text-muted/25',
  sending: 'bg-info/10 text-info border-info/25',
  sent: 'bg-success/10 text-success border-success/25',
  failed: 'bg-danger/10 text-danger border-danger/25',
};

const SEND_STATUS_STYLES: Record<SendStatus, string> = {
  sent: 'text-success',
  failed: 'text-danger',
  suppressed: 'text-warning',
  bounced: 'text-danger',
  complained: 'text-danger',
};

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [list, setList] = useState<List | null>(null);

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
    setList(allLists.find((l) => l.id === c.listId) ?? null);
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

  const contactEmail = (contactId: string) => contacts.find((c) => c.id === contactId)?.email ?? contactId;

  if (!campaign) return null;

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
        {template?.name ?? '—'} · {list?.name ?? '—'} · {new Date(campaign.createdAt).toLocaleString()}
      </p>

      <div className="grid max-w-3xl grid-cols-3 gap-3">
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Sent</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{campaign.sentCount}</div>
        </div>
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Failed</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{campaign.failedCount}</div>
        </div>
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Suppressed</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{campaign.suppressedCount}</div>
        </div>
      </div>

      <div className="mt-5 max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
        <div className="border-b border-border-default bg-surface px-3.5 py-2 text-xs font-semibold text-text-secondary">
          Recipients ({sends.length})
        </div>
        {sends.map((s) => (
          <div key={s.id} className="flex items-center gap-3 border-t border-border-subtle px-3.5 py-2.5 text-xs">
            <div className="flex-1 truncate font-mono text-text-secondary">{contactEmail(s.contactId)}</div>
            <div className={`font-medium ${SEND_STATUS_STYLES[s.status]}`}>{s.status}</div>
            {s.error && <div className="max-w-xs truncate text-text-faint" title={s.error}>{s.error}</div>}
            <div className="w-36 text-right text-text-faint">
              {s.sentAt ? new Date(s.sentAt).toLocaleTimeString() : '—'}
            </div>
          </div>
        ))}
        {sends.length === 0 && <div className="px-3.5 py-8 text-center text-xs text-text-muted">No sends yet.</div>}
      </div>
    </div>
  );
}
