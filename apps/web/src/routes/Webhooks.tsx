import { useEffect, useState } from 'react';
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  listWebhookDeliveries,
  listOutboundSubscriptions,
  createOutboundSubscription,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type WebhookEndpoint,
  type WebhookDelivery,
  type OutboundSubscription,
  type ApiKey,
  type CreatedApiKey,
} from '../lib/webhooksApi';
import { listLists, listTags, type List, type Tag } from '../lib/contactsApi';
import { useAuthStore } from '../stores/useAuthStore';
import { PanelListSkeleton, TableSkeleton } from '../components/skeletons';
import { CopyIcon, CheckCircleIcon } from '../components/icons';

export function Webhooks() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [subscriptions, setSubscriptions] = useState<OutboundSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [newEndpointName, setNewEndpointName] = useState('');
  const [newEndpointSlug, setNewEndpointSlug] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubUrl, setNewSubUrl] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyListId, setNewKeyListId] = useState('');
  const [newKeyTagIds, setNewKeyTagIds] = useState<string[]>([]);
  const [revealedKey, setRevealedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const isOwner = useAuthStore((s) => s.user?.role === 'owner');
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  async function loadEndpoints() {
    const eps = await listWebhookEndpoints();
    setEndpoints(eps);
    // The design shows one merged delivery log — real backend is
    // per-endpoint, so show the most recently created endpoint's log.
    if (eps.length > 0) {
      setDeliveries(await listWebhookDeliveries(eps[eps.length - 1].slug));
    }
  }

  useEffect(() => {
    const tasks = [loadEndpoints(), listOutboundSubscriptions().then(setSubscriptions), listLists().then(setLists), listTags().then(setTags)];
    if (isOwner) tasks.push(listApiKeys().then(setApiKeys));
    Promise.all(tasks).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  async function handleCreateApiKey() {
    if (!newKeyName.trim()) return;
    const created = await createApiKey({
      name: newKeyName.trim(),
      defaultListId: newKeyListId || undefined,
      defaultTagIds: newKeyTagIds.length > 0 ? newKeyTagIds : undefined,
    });
    setRevealedKey(created);
    setNewKeyName('');
    setNewKeyListId('');
    setNewKeyTagIds([]);
    listApiKeys().then(setApiKeys);
  }

  async function handleRevokeApiKey(id: string) {
    await revokeApiKey(id);
    listApiKeys().then(setApiKeys);
  }

  function handleCopyKey() {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCreateEndpoint() {
    if (!newEndpointName.trim() || !newEndpointSlug.trim()) return;
    await createWebhookEndpoint({ name: newEndpointName.trim(), slug: newEndpointSlug.trim() });
    setNewEndpointName('');
    setNewEndpointSlug('');
    loadEndpoints();
  }

  async function handleCreateSubscription() {
    if (!newSubName.trim() || !newSubUrl.trim()) return;
    await createOutboundSubscription({ name: newSubName.trim(), url: newSubUrl.trim(), eventTypes: ['contact.created'] });
    setNewSubName('');
    setNewSubUrl('');
    listOutboundSubscriptions().then(setSubscriptions);
  }

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="text-lg font-semibold text-text-heading">Webhooks</h1>
        <p className="mt-1 text-xs text-text-muted">Inbound endpoints receive events; outbound subscriptions push our events to your systems.</p>
      </div>

      <div className="mb-[18px] grid grid-cols-2 gap-[18px]">
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="border-b border-border-default px-3.5 py-3 text-sm font-semibold text-text-primary">Inbound endpoints</div>
          {loading ? (
            <PanelListSkeleton rows={3} />
          ) : (
          <div className="p-1.5">
            {endpoints.map((w) => (
              <div key={w.id} className="rounded-md px-2.5 py-2.5 hover:bg-raised">
                <div className="text-sm font-medium text-text-secondary">{w.name}</div>
                <div className="mt-1 font-mono text-[11.5px] text-text-muted">POST /webhooks/in/{w.slug}</div>
                <div className="mt-1 font-mono text-[11.5px] text-text-faint">{w.secret.slice(0, 12)}••••</div>
              </div>
            ))}
            {endpoints.length === 0 && <div className="px-2.5 py-4 text-center text-xs text-text-faint">No inbound endpoints yet.</div>}
          </div>
          )}
          {canWrite && (
            <div className="flex gap-1.5 border-t border-border-subtle p-2">
              <input value={newEndpointName} onChange={(e) => setNewEndpointName(e.target.value)} placeholder="Name" className="h-7 flex-1 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint" />
              <input value={newEndpointSlug} onChange={(e) => setNewEndpointSlug(e.target.value)} placeholder="slug" className="h-7 w-24 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint" />
              <button onClick={handleCreateEndpoint} className="h-7 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-raised">
                Add
              </button>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="border-b border-border-default px-3.5 py-3 text-sm font-semibold text-text-primary">Outbound subscriptions</div>
          {loading ? (
            <PanelListSkeleton rows={3} />
          ) : (
          <div className="p-1.5">
            {subscriptions.map((s) => (
              <div key={s.id} className="rounded-md px-2.5 py-2.5 hover:bg-raised">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-accent-light">{s.eventTypes.join(', ')}</span>
                  <span className={`text-[11px] font-semibold ${s.isActive ? 'text-success' : 'text-text-muted'}`}>{s.isActive ? 'active' : 'inactive'}</span>
                </div>
                <div className="mt-1 truncate font-mono text-[11.5px] text-text-muted">{s.url}</div>
              </div>
            ))}
            {subscriptions.length === 0 && <div className="px-2.5 py-4 text-center text-xs text-text-faint">No outbound subscriptions yet.</div>}
          </div>
          )}
          {canWrite && (
            <div className="flex gap-1.5 border-t border-border-subtle p-2">
              <input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="Name" className="h-7 w-20 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint" />
              <input value={newSubUrl} onChange={(e) => setNewSubUrl(e.target.value)} placeholder="https://…" className="h-7 flex-1 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint" />
              <button onClick={handleCreateSubscription} className="h-7 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-raised">
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="mb-[18px] overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="border-b border-border-default px-3.5 py-3">
            <div className="text-sm font-semibold text-text-primary">API keys</div>
            <div className="mt-0.5 text-[11.5px] text-text-faint">
              For external forms/automation tools to push contacts in — endpoint reference, payload/response examples in{' '}
              <code className="rounded bg-field px-1 py-0.5 font-mono text-[10.5px]">docs/PUBLIC_API.md</code>.
            </div>
          </div>

          {revealedKey && (
            <div className="m-3 rounded-md border border-warning/25 bg-warning/10 p-3 text-[11.5px] text-text-secondary">
              <div className="mb-1.5 font-medium text-warning">
                Copy this now — "{revealedKey.name}" won't be shown again.
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border-default bg-field px-2.5 py-2">
                <span className="flex-1 truncate font-mono text-[11.5px] text-text-secondary">{revealedKey.key}</span>
                <button onClick={handleCopyKey} title="Copy" className="shrink-0 text-text-faint hover:text-text-secondary">
                  {copied ? <CheckCircleIcon className="text-success" /> : <CopyIcon />}
                </button>
              </div>
              <button onClick={() => setRevealedKey(null)} className="mt-2 text-[11px] text-text-faint hover:text-text-secondary">
                Dismiss
              </button>
            </div>
          )}

          {loading ? (
            <PanelListSkeleton rows={2} />
          ) : (
            <div className="p-1.5">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-md px-2.5 py-2.5 hover:bg-raised">
                  <div>
                    <div className="text-sm font-medium text-text-secondary">{k.name}</div>
                    <div className="mt-1 font-mono text-[11.5px] text-text-faint">{k.keyPrefix}••••</div>
                    <div className="mt-1 text-[11px] text-text-faint">
                      {k.defaultListId ? (lists.find((l) => l.id === k.defaultListId)?.name ?? 'list') : 'no default list'}
                      {k.defaultTagIds.length > 0 &&
                        ` · ${k.defaultTagIds
                          .map((id) => tags.find((t) => t.id === id)?.name)
                          .filter(Boolean)
                          .join(', ')}`}
                      {' · '}
                      {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleString()}` : 'never used'}
                    </div>
                  </div>
                  {canWrite && (
                    <button onClick={() => handleRevokeApiKey(k.id)} className="shrink-0 text-[11px] text-text-faint hover:text-danger">
                      Revoke
                    </button>
                  )}
                </div>
              ))}
              {apiKeys.length === 0 && <div className="px-2.5 py-4 text-center text-xs text-text-faint">No API keys yet.</div>}
            </div>
          )}

          {canWrite && (
            <div className="flex flex-wrap gap-1.5 border-t border-border-subtle p-2">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Name (e.g. Website contact form)"
                className="h-7 flex-1 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint"
              />
              <select
                value={newKeyListId}
                onChange={(e) => setNewKeyListId(e.target.value)}
                className="h-7 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary"
              >
                <option value="">No default list</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <select
                multiple
                value={newKeyTagIds}
                onChange={(e) => setNewKeyTagIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="h-16 w-32 rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs text-text-primary"
                title="Default tags (ctrl/cmd-click for multiple)"
              >
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button onClick={handleCreateApiKey} className="h-7 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-raised">
                Create key
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={3} rows={5} />
      ) : (
      <div className="overflow-hidden rounded-md border border-border-default bg-panel">
        <div className="border-b border-border-default px-3.5 py-3 text-sm font-semibold text-text-primary">
          Delivery log {endpoints.length > 0 && <span className="font-normal text-text-faint">· {endpoints[endpoints.length - 1].name}</span>}
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-text-meta">
              <th className="px-3.5 py-2 font-medium">Time</th>
              <th className="px-2.5 py-2 font-medium">Signature</th>
              <th className="px-2.5 py-2 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="border-t border-border-subtle">
                <td className="px-3.5 py-2 font-mono text-[11.5px] text-text-faint">{new Date(d.receivedAt).toLocaleString()}</td>
                <td className={`px-2.5 py-2 font-medium ${d.signatureValid ? 'text-success' : 'text-danger'}`}>{d.signatureValid ? 'valid' : 'invalid'}</td>
                <td className="px-2.5 py-2 text-text-tertiary">{d.error ?? '—'}</td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3.5 py-6 text-center text-text-muted">
                  No deliveries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
