import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTriggers, updateTrigger, removeTrigger, type Trigger } from '../lib/triggersApi';
import { listSequences, type Sequence } from '../lib/sequencesApi';
import { listWebhookEndpoints, type WebhookEndpoint } from '../lib/webhooksApi';
import { NewTriggerModal } from '../components/NewTriggerModal';
import { useAuthStore } from '../stores/useAuthStore';
import { ClockIcon, BoltIcon, WebhookIcon } from '../components/icons';

export function Triggers() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  function load() {
    listTriggers().then(setTriggers);
    listSequences().then(setSequences);
    listWebhookEndpoints().then(setWebhookEndpoints);
  }

  useEffect(load, []);

  const sequenceName = (id: string) => sequences.find((s) => s.id === id)?.name ?? id;
  const endpointLabel = (id: string | null) => {
    const ep = webhookEndpoints.find((e) => e.id === id);
    return ep ? `webhook: ${ep.name}` : 'webhook';
  };

  async function toggleActive(t: Trigger) {
    await updateTrigger(t.id, { isActive: !t.isActive });
    load();
  }

  async function handleRemove(t: Trigger) {
    await removeTrigger(t.id);
    load();
  }

  return (
    <div>
      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Triggers</h1>
          <p className="mt-1 text-xs text-text-muted">Automatically enroll contacts into sequences on conditions or schedules.</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
          >
            New trigger
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {triggers.map((t) => (
          <div key={t.id} className="flex items-center gap-3.5 rounded-md border border-border-default bg-panel p-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-tertiary">
              {t.eventType === 'schedule' ? <ClockIcon /> : t.eventType === 'webhook' ? <WebhookIcon /> : <BoltIcon />}
            </div>
            <Link to={`/triggers/${t.id}`} className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-text-primary hover:text-accent-light">{t.name}</div>
              <div className="mt-0.5 text-xs text-text-muted">
                {t.eventType === 'schedule'
                  ? `${t.scheduleCron} (${t.scheduleTimezone})`
                  : t.eventType === 'webhook'
                    ? endpointLabel(t.webhookEndpointId)
                    : t.eventType}{' '}
                → enroll in{' '}
                <span className="text-accent-light">{sequenceName(t.sequenceId)}</span>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-text-meta">{t.firedCount ?? 0} fired</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  t.isActive ? 'border-success/25 bg-success/10 text-success' : 'border-text-muted/25 bg-text-muted/10 text-text-muted'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {t.isActive ? 'active' : 'paused'}
              </span>
              {canWrite && (
                <>
                  <button onClick={() => toggleActive(t)} className="text-xs font-medium text-text-tertiary hover:text-text-primary">
                    {t.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => handleRemove(t)} className="text-xs font-medium text-text-faint hover:text-danger">
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {triggers.length === 0 && (
          <div className="rounded-md border border-border-default bg-panel px-3.5 py-8 text-center text-xs text-text-muted">
            No triggers yet.
          </div>
        )}
      </div>

      {modalOpen && (
        <NewTriggerModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
