import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listCampaigns, type Campaign, type CampaignStatus } from '../lib/campaignsApi';
import { listTemplates, type Template } from '../lib/templatesApi';
import { listLists } from '../lib/contactsApi';
import type { List } from '../lib/contactsApi';
import { useAuthStore } from '../stores/useAuthStore';

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-text-muted/10 text-text-muted border-text-muted/25',
  sending: 'bg-info/10 text-info border-info/25',
  sent: 'bg-success/10 text-success border-success/25',
  failed: 'bg-danger/10 text-danger border-danger/25',
};

export function CampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const navigate = useNavigate();
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  useEffect(() => {
    listCampaigns().then(setCampaigns);
    listTemplates().then(setTemplates);
    listLists().then(setLists);
  }, []);

  const templateName = (id: string) => templates.find((t) => t.id === id)?.name ?? '—';
  const listName = (id: string) => lists.find((l) => l.id === id)?.name ?? '—';

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Campaigns</h1>
          <p className="mt-1 text-xs text-text-muted">One-off broadcast sends to a list.</p>
        </div>
        {canWrite && (
          <button
            onClick={() => navigate('/campaigns/new')}
            className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
          >
            New campaign
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border-default bg-panel">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-default bg-surface text-[11px] uppercase tracking-wide text-text-meta">
              <th className="px-3 py-2 text-left font-medium">Campaign</th>
              <th className="px-3 py-2 text-right font-medium">Sent</th>
              <th className="px-3 py-2 text-right font-medium">Failed</th>
              <th className="px-3 py-2 text-right font-medium">Suppressed</th>
              <th className="px-3 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-border-subtle hover:bg-raised">
                <td className="px-3 py-2.5">
                  <Link to={`/campaigns/${c.id}`} className="font-medium text-text-secondary hover:text-text-primary">
                    {c.name}
                  </Link>
                  <div className="mt-0.5 text-[11px] text-text-faint">
                    {templateName(c.templateId)} · {listName(c.listId)}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{c.sentCount}</td>
                <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{c.failedCount}</td>
                <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{c.suppressedCount}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[c.status]}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                  No campaigns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
