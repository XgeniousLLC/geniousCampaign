import { useEffect, useState } from 'react';
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  listWebhookDeliveries,
  listOutboundSubscriptions,
  createOutboundSubscription,
  type WebhookEndpoint,
  type WebhookDelivery,
  type OutboundSubscription,
} from '../lib/webhooksApi';
import { useAuthStore } from '../stores/useAuthStore';
import { PanelListSkeleton, TableSkeleton } from '../components/skeletons';

export function Webhooks() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [subscriptions, setSubscriptions] = useState<OutboundSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [newEndpointName, setNewEndpointName] = useState('');
  const [newEndpointSlug, setNewEndpointSlug] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubUrl, setNewSubUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inbound' | 'outbound' | 'log'>('inbound');
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
    Promise.all([loadEndpoints(), listOutboundSubscriptions().then(setSubscriptions)]).finally(() => setLoading(false));
  }, []);

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

      <div className="mb-3 flex gap-1.5">
        {(
          [
            { key: 'inbound', label: 'Inbound endpoints', count: endpoints.length },
            { key: 'outbound', label: 'Outbound subscriptions', count: subscriptions.length },
            { key: 'log', label: 'Delivery log', count: deliveries.length },
          ] as const
        ).map((t) => (
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

      {tab === 'inbound' && (
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="border-b border-border-default px-3.5 py-3 text-sm font-semibold text-text-primary">
            Inbound endpoints
            <p className="mt-0.5 text-xs font-normal text-text-faint">External systems POST events to these — each gets its own HMAC secret.</p>
          </div>
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
      )}

      {tab === 'outbound' && (
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="border-b border-border-default px-3.5 py-3 text-sm font-semibold text-text-primary">
            Outbound subscriptions
            <p className="mt-0.5 text-xs font-normal text-text-faint">We POST our own events to these URLs as they happen.</p>
          </div>
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
      )}

      {tab === 'log' &&
        (loading ? (
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
        ))}
    </div>
  );
}
