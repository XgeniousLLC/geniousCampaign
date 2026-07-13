import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign, sendCampaign, type Campaign, type CampaignAudienceType } from '../lib/campaignsApi';
import { listTemplates, type Template } from '../lib/templatesApi';
import { listLists, listContactsForList, listContactsForTag, createList, createTag, listTags, listContacts, type List, type Tag, type Contact } from '../lib/contactsApi';

const AUDIENCE_TABS: { value: CampaignAudienceType; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'tags', label: 'Tags' },
  { value: 'contacts', label: 'Individual contacts' },
];

function defaultCampaignName(): string {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `Campaign — ${date}`;
}

async function uniqueContactCountAcrossLists(listIds: string[]): Promise<Set<string>> {
  const results = await Promise.all(listIds.map((id) => listContactsForList(id)));
  return new Set(results.flat().map((r) => r.contact.id));
}

export function CampaignCompose() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [name, setName] = useState(defaultCampaignName);
  const [templateId, setTemplateId] = useState('');
  const [audienceType, setAudienceType] = useState<CampaignAudienceType>('list');
  const [listIds, setListIds] = useState<string[]>([]);
  const [excludeListIds, setExcludeListIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilterTagIds, setContactFilterTagIds] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [sendToEmail, setSendToEmail] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{ campaign: Campaign; recipientCount: number; threshold: number } | null>(null);

  useEffect(() => {
    listTemplates({ includeVariants: true }).then((t) => {
      setTemplates(t);
      const topLevel = t.find((x) => !x.parentTemplateId);
      if (topLevel) setTemplateId(topLevel.id);
    });
    listLists().then((l) => {
      setLists(l);
      if (l.length > 0) setListIds([l[0].id]);
    });
    listTags().then(setTags);
    listContacts().then(setAllContacts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function compute() {
      let ids: Set<string>;
      if (audienceType === 'list') {
        if (listIds.length === 0) {
          if (!cancelled) setRecipientCount(null);
          return;
        }
        ids = await uniqueContactCountAcrossLists(listIds);
      } else if (audienceType === 'tags') {
        if (selectedTagIds.length === 0) {
          if (!cancelled) setRecipientCount(0);
          return;
        }
        const results = await Promise.all(selectedTagIds.map((id) => listContactsForTag(id)));
        ids = new Set(results.flat().map((r) => r.contact.id));
      } else {
        ids = new Set(selectedContactIds);
      }
      if (excludeListIds.length > 0) {
        const excluded = await uniqueContactCountAcrossLists(excludeListIds);
        for (const id of excluded) ids.delete(id);
      }
      if (!cancelled) setRecipientCount(ids.size);
    }
    compute();
    return () => {
      cancelled = true;
    };
  }, [audienceType, listIds, excludeListIds, selectedTagIds, selectedContactIds]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const filteredContacts = useMemo(() => {
    let result = allContacts;
    if (contactFilterTagIds.length > 0) {
      result = result.filter((c) => (c.tags ?? []).some((t) => contactFilterTagIds.includes(t.id)));
    }
    if (contactSearch.trim()) {
      const q = contactSearch.toLowerCase();
      result = result.filter((c) => `${c.email} ${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase().includes(q));
    }
    return result;
  }, [allContacts, contactSearch, contactFilterTagIds]);

  async function handleCreateList() {
    if (!newListName.trim()) return;
    const created = await createList({ name: newListName.trim() });
    setLists((prev) => [...prev, created]);
    setListIds((prev) => [...prev, created.id]);
    setNewListName('');
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    const created = await createTag({ name: newTagName.trim() });
    setTags((prev) => [...prev, created]);
    setSelectedTagIds((prev) => [...prev, created.id]);
    setNewTagName('');
  }

  function toggleListId(id: string) {
    setListIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
  }

  function toggleExcludeListId(id: string) {
    setExcludeListIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function toggleContactFilterTag(id: string) {
    setContactFilterTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function audienceValid() {
    if (audienceType === 'list') return listIds.length > 0;
    if (audienceType === 'tags') return selectedTagIds.length > 0;
    return selectedContactIds.length > 0;
  }

  async function handleSend() {
    if (!name.trim() || !templateId || !audienceValid()) {
      setError('Name, template, and an audience are all required.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        templateId,
        audienceType,
        listIds: audienceType === 'list' ? listIds : undefined,
        excludeListIds: excludeListIds.length > 0 ? excludeListIds : undefined,
        tagIds: audienceType === 'tags' ? selectedTagIds : undefined,
        contactIds: audienceType === 'contacts' ? selectedContactIds : undefined,
        isDryRun,
        sendToEmail: sendToEmail.trim() || undefined,
      });
      const result = await sendCampaign(campaign.id);
      if (result.status === 'confirmation_required') {
        setPendingConfirmation({ campaign, recipientCount: result.recipientCount!, threshold: result.threshold! });
        setSending(false);
        return;
      }
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSending(false);
    }
  }

  async function handleConfirmLargeSend() {
    if (!pendingConfirmation) return;
    setSending(true);
    try {
      await sendCampaign(pendingConfirmation.campaign.id, true);
      navigate(`/campaigns/${pendingConfirmation.campaign.id}`);
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
              {templates
                .filter((t) => !t.parentTemplateId)
                .map((t) => (
                  <optgroup key={t.id} label={t.name}>
                    <option value={t.id}>{t.name}</option>
                    {templates
                      .filter((v) => v.parentTemplateId === t.id)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          ↳ {v.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
            </select>
            {selectedTemplate && (
              <div className="mt-2.5 text-xs text-text-muted">
                Subject: <span className="font-mono text-text-tertiary">{selectedTemplate.subject}</span>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border-default bg-panel p-5">
            <label className="mb-3 block text-xs font-semibold text-text-secondary">Audience</label>
            <div className="mb-4 flex gap-1.5 rounded-md border border-border-default bg-surface p-1.5">
              {AUDIENCE_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setAudienceType(t.value)}
                  className={`flex-1 rounded px-2.5 py-2 text-xs font-medium ${
                    audienceType === t.value ? 'bg-raised text-text-primary' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {audienceType === 'list' && (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="mb-2 text-[11px] text-text-faint">Sends to every contact in any of the selected lists.</div>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-border-subtle">
                    {lists.map((l) => (
                      <label
                        key={l.id}
                        className="flex cursor-pointer items-center gap-2 border-t border-border-subtle px-2.5 py-2 text-xs first:border-t-0 hover:bg-raised"
                      >
                        <input type="checkbox" checked={listIds.includes(l.id)} onChange={() => toggleListId(l.id)} />
                        <span className="truncate text-text-secondary">{l.name}</span>
                      </label>
                    ))}
                    {lists.length === 0 && <div className="px-2.5 py-4 text-center text-[11px] text-text-faint">No lists yet.</div>}
                  </div>
                </div>
                <div className="flex gap-2">
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
              </div>
            )}

            {audienceType === 'tags' && (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="mb-2.5 text-[11px] text-text-faint">Sends to any contact with at least one selected tag.</div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => {
                      const selected = selectedTagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTag(t.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            selected ? '' : 'border-border-default text-text-tertiary hover:bg-raised'
                          }`}
                          style={selected ? { borderColor: t.color, backgroundColor: `${t.color}22`, color: t.color } : undefined}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </button>
                      );
                    })}
                    {tags.length === 0 && <span className="text-[11px] text-text-faint">No tags yet.</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Or create a new tag…"
                    className="h-8 flex-1 rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary placeholder:text-text-faint"
                  />
                  <button
                    onClick={handleCreateTag}
                    className="h-8 rounded-md border border-border-subtle px-2.5 text-xs font-medium text-text-secondary hover:bg-raised"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {audienceType === 'contacts' && (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] text-text-faint">
                  {selectedContactIds.length} contact{selectedContactIds.length === 1 ? '' : 's'} selected — useful for test or VIP sends.
                </div>
                {tags.length > 0 && (
                  <div>
                    <div className="mb-2 text-[11px] text-text-faint">Filter by tag</div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t) => {
                        const selected = contactFilterTagIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleContactFilterTag(t.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                              selected ? '' : 'border-border-default text-text-tertiary hover:bg-raised'
                            }`}
                            style={selected ? { borderColor: t.color, backgroundColor: `${t.color}22`, color: t.color } : undefined}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search by email or name…"
                  className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary placeholder:text-text-faint"
                />
                <div className="max-h-56 overflow-y-auto rounded-md border border-border-subtle">
                  {filteredContacts.slice(0, 200).map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 border-t border-border-subtle px-2.5 py-2 text-xs first:border-t-0 hover:bg-raised"
                    >
                      <input type="checkbox" checked={selectedContactIds.includes(c.id)} onChange={() => toggleContact(c.id)} />
                      <span className="truncate text-text-secondary">
                        {c.firstName || c.lastName ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : c.email}
                      </span>
                      {(c.firstName || c.lastName) && <span className="truncate font-mono text-[10.5px] text-text-faint">{c.email}</span>}
                    </label>
                  ))}
                  {filteredContacts.length === 0 && <div className="px-2.5 py-4 text-center text-[11px] text-text-faint">No matching contacts.</div>}
                </div>
              </div>
            )}

            <div className="mt-4 border-t border-border-subtle pt-4">
              <div className="mb-2 text-[11px] text-text-faint">Exclude contacts in list(s) (optional)</div>
              <div className="max-h-32 overflow-y-auto rounded-md border border-border-subtle">
                {lists.map((l) => (
                  <label
                    key={l.id}
                    className="flex cursor-pointer items-center gap-2 border-t border-border-subtle px-2.5 py-2 text-xs first:border-t-0 hover:bg-raised"
                  >
                    <input type="checkbox" checked={excludeListIds.includes(l.id)} onChange={() => toggleExcludeListId(l.id)} />
                    <span className="truncate text-text-secondary">{l.name}</span>
                  </label>
                ))}
                {lists.length === 0 && <div className="px-2.5 py-3 text-center text-[11px] text-text-faint">No lists yet.</div>}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-md border border-border-subtle bg-surface px-2.5 py-2">
              <span className="text-xs text-text-tertiary">Suppressed contacts excluded automatically</span>
              <span className="text-xs font-semibold text-success">✓</span>
            </div>
          </div>

          <div className="rounded-md border border-border-default bg-panel p-4">
            <label className="mb-2 block text-xs font-semibold text-text-secondary">Send-to-self (optional)</label>
            <input
              value={sendToEmail}
              onChange={(e) => setSendToEmail(e.target.value)}
              placeholder="you@company.com — redirect every send here for QA"
              className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
            />
            <div className="mt-1.5 text-[11px] text-text-faint">
              A real send, redirected to this address for every recipient — useful for QA before a real campaign.
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

          {pendingConfirmation && (
            <label className="mt-3 flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 p-2.5 text-[11.5px] leading-snug text-text-secondary">
              <input type="checkbox" className="mt-0.5" onChange={handleConfirmLargeSend} />
              This is a large send ({pendingConfirmation.recipientCount} recipients, over the {pendingConfirmation.threshold}-recipient
              threshold). I've reviewed the template and list — send anyway.
            </label>
          )}

          {error && <div className="mt-2 text-xs text-danger">{error}</div>}
          <button
            onClick={handleSend}
            disabled={sending || !templateId || !audienceValid() || !!pendingConfirmation}
            className="mt-3 h-9 w-full rounded-md bg-accent text-xs font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : isDryRun ? 'Send dry run' : 'Send campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
