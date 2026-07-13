import { useEffect, useState } from 'react';
import { createTrigger } from '../lib/triggersApi';
import { listSequences, type Sequence } from '../lib/sequencesApi';
import { listWebhookEndpoints, type WebhookEndpoint } from '../lib/webhooksApi';
import { CloseIcon } from './icons';

const EVENT_TYPES = [
  'contact.created',
  'contact.tag_added',
  'contact.field_changed',
  'contact.list_joined',
  'email.opened',
  'email.clicked',
];

const OPS = ['equals', 'contains', 'gt', 'lt', 'in', 'exists'] as const;

type TriggerType = 'condition' | 'schedule' | 'webhook';

export function NewTriggerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [triggerType, setTriggerType] = useState<TriggerType>('condition');
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [field, setField] = useState('tagName');
  const [op, setOp] = useState<(typeof OPS)[number]>('equals');
  const [value, setValue] = useState('');
  const [scheduleCron, setScheduleCron] = useState('0 9 * * 1');
  const [scheduleTimezone, setScheduleTimezone] = useState('UTC');
  const [webhookEndpointId, setWebhookEndpointId] = useState('');
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);
  const [sequenceId, setSequenceId] = useState('');
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listSequences().then((s) => {
      setSequences(s);
      if (s.length > 0) setSequenceId(s[0].id);
    });
    listWebhookEndpoints().then((eps) => {
      setWebhookEndpoints(eps);
      if (eps.length > 0) setWebhookEndpointId(eps[0].id);
    });
  }, []);

  async function handleCreate() {
    if (!name.trim() || !sequenceId) {
      setError('Name and target sequence are required.');
      return;
    }
    if (triggerType === 'webhook' && !webhookEndpointId) {
      setError('A webhook endpoint is required — create one on the Webhooks page first.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createTrigger({
        name: name.trim(),
        eventType: triggerType === 'schedule' ? 'schedule' : triggerType === 'webhook' ? 'webhook' : eventType,
        conditions: { field, op, value: op === 'exists' ? undefined : value },
        sequenceId,
        scheduleCron: triggerType === 'schedule' ? scheduleCron : undefined,
        scheduleTimezone: triggerType === 'schedule' ? scheduleTimezone : undefined,
        webhookEndpointId: triggerType === 'webhook' ? webhookEndpointId : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="flex max-h-[84vh] w-[540px] max-w-full flex-col rounded-xl border border-border-modal bg-panel2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <h3 className="text-sm font-semibold text-text-heading">New trigger</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[18px]">
          <label className="mb-2 block text-xs font-semibold text-text-secondary">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Demo booked → Onboarding"
            className="mb-4 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />

          <label className="mb-2 block text-xs font-semibold text-text-secondary">Trigger type</label>
          <div className="mb-[18px] flex flex-col gap-1.5">
            {(['condition', 'schedule', 'webhook'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTriggerType(t)}
                className={`flex items-center gap-2.5 rounded-md border p-2.5 text-left ${
                  triggerType === t ? 'border-accent/40 bg-accent/10' : 'border-border-subtle bg-surface'
                }`}
              >
                <span className={`h-3 w-3 rounded-full border-2 ${triggerType === t ? 'border-accent bg-accent' : 'border-border-strong'}`} />
                <span>
                  <div className="text-sm font-semibold text-text-primary">
                    {t === 'condition' ? 'Condition-based' : t === 'schedule' ? 'Schedule-based' : 'Webhook-based'}
                  </div>
                  <div className="text-[11.5px] text-text-muted">
                    {t === 'condition'
                      ? 'Fires when a real event matches a condition.'
                      : t === 'schedule'
                        ? 'Fires on a recurring cron schedule.'
                        : 'Fires when a signed inbound webhook payload matches a condition.'}
                  </div>
                </span>
              </button>
            ))}
          </div>

          {triggerType === 'condition' && (
            <>
              <label className="mb-2 block text-xs font-semibold text-text-secondary">When</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="mb-2.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
              >
                {EVENT_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
              <div className="mb-[18px] grid grid-cols-3 gap-2">
                <input value={field} onChange={(e) => setField(e.target.value)} placeholder="field (e.g. tagName)" className="h-[34px] rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary" />
                <select value={op} onChange={(e) => setOp(e.target.value as typeof op)} className="h-[34px] rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary">
                  {OPS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" className="h-[34px] rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary" />
              </div>
            </>
          )}

          {triggerType === 'schedule' && (
            <>
              <label className="mb-2 block text-xs font-semibold text-text-secondary">Run</label>
              <div className="mb-[18px] grid grid-cols-2 gap-2">
                <input
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  placeholder="cron, e.g. 0 9 * * 1"
                  className="h-[34px] rounded-md border border-border-subtle bg-surface px-2.5 font-mono text-xs text-text-primary"
                />
                <input
                  value={scheduleTimezone}
                  onChange={(e) => setScheduleTimezone(e.target.value)}
                  placeholder="timezone, e.g. UTC"
                  className="h-[34px] rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary"
                />
              </div>
            </>
          )}

          {triggerType === 'webhook' && (
            <>
              <label className="mb-2 block text-xs font-semibold text-text-secondary">Webhook endpoint</label>
              <select
                value={webhookEndpointId}
                onChange={(e) => setWebhookEndpointId(e.target.value)}
                className="mb-2.5 h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary"
              >
                {webhookEndpoints.length === 0 && <option value="">No webhook endpoints yet</option>}
                {webhookEndpoints.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name} (/webhooks/in/{ep.slug})
                  </option>
                ))}
              </select>
              {webhookEndpoints.length === 0 && (
                <p className="mb-2.5 text-[11.5px] text-warning">Create a webhook endpoint on the Webhooks page first.</p>
              )}
              <label className="mb-2 block text-xs font-semibold text-text-secondary">Condition (matched against the payload)</label>
              <div className="mb-[18px] grid grid-cols-3 gap-2">
                <input value={field} onChange={(e) => setField(e.target.value)} placeholder="field (e.g. plan)" className="h-[34px] rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary" />
                <select value={op} onChange={(e) => setOp(e.target.value as typeof op)} className="h-[34px] rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary">
                  {OPS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" className="h-[34px] rounded-md border border-border-subtle bg-surface px-2.5 text-xs text-text-primary" />
              </div>
            </>
          )}

          <label className="mb-2 block text-xs font-semibold text-text-secondary">Enroll into sequence</label>
          <select value={sequenceId} onChange={(e) => setSequenceId(e.target.value)} className="h-[34px] w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary">
            {sequences.length === 0 && <option value="">No sequences yet</option>}
            {sequences.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {error && <div className="mt-3 text-xs text-danger">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <button onClick={onClose} className="h-[34px] rounded-md border border-border-subtle px-3.5 text-sm font-medium text-text-secondary hover:bg-raised">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create trigger'}
          </button>
        </div>
      </div>
    </div>
  );
}
