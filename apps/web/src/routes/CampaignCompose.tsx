import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign, sendCampaign } from '../lib/campaignsApi';
import { listTemplates, type Template } from '../lib/templatesApi';
import { listLists, listContactsForList, createList, type List } from '../lib/contactsApi';

export function CampaignCompose() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [listId, setListId] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listTemplates().then((t) => {
      setTemplates(t);
      if (t.length > 0) setTemplateId(t[0].id);
    });
    listLists().then((l) => {
      setLists(l);
      if (l.length > 0) setListId(l[0].id);
    });
  }, []);

  useEffect(() => {
    if (!listId) {
      setRecipientCount(null);
      return;
    }
    listContactsForList(listId).then((rows) => setRecipientCount(rows.length));
  }, [listId]);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  async function handleCreateList() {
    if (!newListName.trim()) return;
    const created = await createList({ name: newListName.trim() });
    setLists((prev) => [...prev, created]);
    setListId(created.id);
    setNewListName('');
  }

  async function handleSend() {
    if (!name.trim() || !templateId || !listId) {
      setError('Name, template, and list are all required.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const campaign = await createCampaign({ name: name.trim(), templateId, listId, isDryRun });
      await sendCampaign(campaign.id);
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSending(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate('/campaigns')}
        className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary"
      >
        ← Campaigns
      </button>
      <h1 className="mb-5 text-lg font-semibold text-text-heading">New campaign</h1>

      <div className="grid max-w-3xl grid-cols-[1fr_320px] items-start gap-5">
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border-default bg-panel p-4">
            <label className="mb-2 block text-xs font-semibold text-text-secondary">Campaign name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. August product update"
              className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
            />
          </div>

          <div className="rounded-md border border-border-default bg-panel p-4">
            <label className="mb-2 block text-xs font-semibold text-text-secondary">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
            >
              {templates.length === 0 && <option value="">No templates yet</option>}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="mt-2.5 text-xs text-text-muted">
                Subject: <span className="font-mono text-text-tertiary">{selectedTemplate.subject}</span>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border-default bg-panel p-4">
            <label className="mb-2 block text-xs font-semibold text-text-secondary">Audience (list)</label>
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
            >
              {lists.length === 0 && <option value="">No lists yet</option>}
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <div className="mt-2.5 flex gap-2">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Or create a new list…"
                className="h-8 flex-1 rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary placeholder:text-text-faint"
              />
              <button
                onClick={handleCreateList}
                className="h-8 rounded-md border border-border-subtle px-2.5 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Create
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border border-border-subtle bg-surface px-2.5 py-2">
              <span className="text-xs text-text-tertiary">Suppressed contacts excluded automatically</span>
              <span className="text-xs font-semibold text-success">✓</span>
            </div>
          </div>
        </div>

        <div className="sticky top-0 rounded-md border border-border-default bg-panel p-4">
          <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-text-meta">Pre-send summary</div>
          <div className="py-3 text-center">
            <div className="font-mono text-3xl font-semibold leading-none text-text-heading">{recipientCount ?? '—'}</div>
            <div className="mt-1 text-xs text-text-muted">estimated recipients</div>
          </div>
          <div className="flex items-center justify-between border-t border-border-subtle py-2.5">
            <div>
              <div className="text-xs font-medium text-text-secondary">Dry-run</div>
              <div className="text-[11px] text-text-faint">Preview without sending</div>
            </div>
            <button
              onClick={() => setIsDryRun((v) => !v)}
              className={`h-5 w-9 rounded-full transition-colors ${isDryRun ? 'bg-accent' : 'bg-border-subtle'}`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white transition-transform ${isDryRun ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
          {error && <div className="mt-2 text-xs text-danger">{error}</div>}
          <button
            onClick={handleSend}
            disabled={sending || !templateId || !listId}
            className="mt-3 h-9 w-full rounded-md bg-accent text-xs font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : isDryRun ? 'Send dry run' : 'Send campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
