import { useEffect, useState } from 'react';
import {
  enrollContact,
  listEnrollmentsForContact,
  pauseEnrollment,
  resumeEnrollment,
  stopEnrollment,
  type Enrollment,
} from '../lib/enrollmentsApi';
import { listSequences, type Sequence } from '../lib/sequencesApi';
import { useAuthStore } from '../stores/useAuthStore';

const STATUS_STYLES: Record<Enrollment['status'], string> = {
  active: 'bg-success/10 text-success border-success/25',
  paused: 'bg-warning/10 text-warning border-warning/25',
  stopped: 'bg-danger/10 text-danger border-danger/25',
  completed: 'bg-text-muted/10 text-text-muted border-text-muted/25',
};

export function ContactEnrollments({ contactId }: { contactId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  async function reload() {
    const [e, s] = await Promise.all([listEnrollmentsForContact(contactId), listSequences()]);
    setEnrollments(e);
    setSequences(s);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  function sequenceName(id: string) {
    return sequences.find((s) => s.id === id)?.name ?? id;
  }

  async function handleEnroll() {
    if (!selectedSequenceId) return;
    setBusy('enroll');
    try {
      await enrollContact(selectedSequenceId, contactId);
      setSelectedSequenceId('');
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function handleAction(action: 'pause' | 'resume' | 'stop', sequenceId: string) {
    setBusy(sequenceId + action);
    try {
      const fn = action === 'pause' ? pauseEnrollment : action === 'resume' ? resumeEnrollment : stopEnrollment;
      await fn(sequenceId, contactId);
      await reload();
    } finally {
      setBusy(null);
    }
  }

  const enrolledSequenceIds = new Set(enrollments.filter((e) => e.status === 'active' || e.status === 'paused').map((e) => e.sequenceId));
  const availableSequences = sequences.filter((s) => !enrolledSequenceIds.has(s.id));

  return (
    <div className="rounded-md border border-border-default bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-text-label">Sequence enrollments</div>
      </div>

      {canWrite && (
        <div className="mb-4 flex items-center gap-2">
          <select
            value={selectedSequenceId}
            onChange={(e) => setSelectedSequenceId(e.target.value)}
            className="h-8 flex-1 rounded-md border border-border-strong bg-field px-2 text-xs text-text-primary"
          >
            <option value="">Enroll in a sequence…</option>
            {availableSequences.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleEnroll}
            disabled={!selectedSequenceId || busy === 'enroll'}
            className="h-8 shrink-0 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Enroll
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {enrollments.map((e) => (
          <div key={e.id} className="rounded-md border border-border-subtle bg-surface p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-secondary">{sequenceName(e.sequenceId)}</span>
              <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] ${STATUS_STYLES[e.status]}`}>
                {e.status}
              </span>
            </div>
            {canWrite && (e.status === 'active' || e.status === 'paused') && (
              <div className="flex gap-1.5">
                {e.status === 'active' && (
                  <button
                    onClick={() => handleAction('pause', e.sequenceId)}
                    disabled={busy === e.sequenceId + 'pause'}
                    className="h-6 rounded border border-border-default px-2 text-[11px] text-text-muted hover:text-text-primary disabled:opacity-50"
                  >
                    Pause
                  </button>
                )}
                {e.status === 'paused' && (
                  <button
                    onClick={() => handleAction('resume', e.sequenceId)}
                    disabled={busy === e.sequenceId + 'resume'}
                    className="h-6 rounded border border-border-default px-2 text-[11px] text-text-muted hover:text-text-primary disabled:opacity-50"
                  >
                    Resume
                  </button>
                )}
                <button
                  onClick={() => handleAction('stop', e.sequenceId)}
                  disabled={busy === e.sequenceId + 'stop'}
                  className="h-6 rounded border border-danger/30 px-2 text-[11px] text-danger hover:bg-danger/10 disabled:opacity-50"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        ))}
        {enrollments.length === 0 && <div className="text-xs text-text-faint">Not enrolled in any sequences.</div>}
      </div>
    </div>
  );
}
