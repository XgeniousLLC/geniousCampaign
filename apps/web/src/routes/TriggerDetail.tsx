import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getTrigger, getTriggerStats, listTriggerEvaluations, type Trigger, type TriggerStats, type TriggerEvaluation } from '../lib/triggersApi';
import { listSequences, type Sequence } from '../lib/sequencesApi';
import { listWebhookEndpoints, type WebhookEndpoint } from '../lib/webhooksApi';
import { avatarColor } from '../lib/contactsApi';

function initialsFromEmail(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function TriggerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [stats, setStats] = useState<TriggerStats | null>(null);
  const [evaluations, setEvaluations] = useState<TriggerEvaluation[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([getTrigger(id), getTriggerStats(id), listTriggerEvaluations(id), listSequences(), listWebhookEndpoints()]).then(
      ([t, s, evals, seqs, endpoints]) => {
        setTrigger(t);
        setStats(s);
        setEvaluations(evals);
        setSequences(seqs);
        setWebhookEndpoints(endpoints);
      },
    );
  }, [id]);

  if (!trigger || !stats) return <div className="text-sm text-text-muted">Loading…</div>;

  const sequenceName = sequences.find((s) => s.id === trigger.sequenceId)?.name ?? trigger.sequenceId;
  const webhookEndpoint = webhookEndpoints.find((e) => e.id === trigger.webhookEndpointId);
  const successRatePct = stats.totalFires > 0 ? ((stats.enrolledCount / stats.totalFires) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <button onClick={() => navigate('/triggers')} className="mb-3 flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary">
        ← Triggers
      </button>

      <div className="mb-1 flex items-center gap-2.5">
        <h1 className="text-lg font-semibold text-text-heading">{trigger.name}</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            trigger.isActive ? 'border-success/25 bg-success/10 text-success' : 'border-text-muted/25 bg-text-muted/10 text-text-muted'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {trigger.isActive ? 'active' : 'paused'}
        </span>
      </div>
      <p className="mb-5 text-xs text-text-muted">
        {trigger.eventType === 'schedule'
          ? `${trigger.scheduleCron} (${trigger.scheduleTimezone})`
          : trigger.eventType === 'webhook'
            ? `webhook: ${webhookEndpoint?.name ?? trigger.webhookEndpointId}`
            : trigger.eventType}{' '}
        → enroll in{' '}
        <Link to={`/sequences/${trigger.sequenceId}`} className="text-accent-light hover:underline">
          {sequenceName}
        </Link>
      </p>

      <div className="mb-3.5 grid max-w-[820px] grid-cols-4 gap-3">
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Total fires</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{stats.totalFires}</div>
        </div>
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Enrolled</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{stats.enrolledCount}</div>
          <div className="mt-1 text-[11px] text-success">{successRatePct}%</div>
        </div>
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Skipped</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-text-heading">{stats.skippedCount}</div>
          <div className="mt-1 text-[11px] text-text-faint">already enrolled / error</div>
        </div>
        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <div className="text-xs text-text-muted">Last fired</div>
          <div className="mt-1.5 text-sm font-semibold text-text-heading">{stats.lastFiredAt ? new Date(stats.lastFiredAt).toLocaleString() : '—'}</div>
        </div>
      </div>

      <div className="max-w-[820px] overflow-hidden rounded-md border border-border-default bg-panel">
        <div className="border-b border-border-default bg-surface px-3.5 py-2 text-xs font-semibold text-text-secondary">
          Fired events ({evaluations.length})
        </div>
        {evaluations.map((e) => (
          <div key={e.id} className="flex items-center gap-2.5 border-t border-border-subtle px-3.5 py-2.5 text-xs first:border-t-0">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: avatarColor(e.contactId) }}
            >
              {initialsFromEmail(e.contactEmail)}
            </span>
            <Link to={`/contacts/${e.contactId}`} className="min-w-0 flex-1 truncate font-mono text-text-secondary hover:text-text-primary">
              {e.contactEmail}
            </Link>
            <span className="text-text-tertiary">{e.eventType}</span>
            <span className={`font-medium ${e.enrolled ? 'text-success' : 'text-text-faint'}`} title={e.error ?? undefined}>
              {e.enrolled ? 'Enrolled' : e.error ? 'Error' : 'Already enrolled'}
            </span>
            <span className="w-40 shrink-0 text-right text-text-faint">{new Date(e.createdAt).toLocaleString()}</span>
          </div>
        ))}
        {evaluations.length === 0 && <div className="px-3.5 py-8 text-center text-text-muted">No fires yet.</div>}
      </div>
    </div>
  );
}
