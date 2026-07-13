import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSequence, listSequences, type Sequence } from '../lib/sequencesApi';
import { useAuthStore } from '../stores/useAuthStore';

export function SequencesList() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const navigate = useNavigate();
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  useEffect(() => {
    listSequences().then(setSequences);
  }, []);

  async function handleNew() {
    const created = await createSequence({ name: 'Untitled sequence' });
    navigate(`/sequences/${created.id}`);
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Sequences</h1>
          <p className="mt-1 text-xs text-text-muted">Multi-step automated outreach with delays between each send.</p>
        </div>
        {canWrite && (
          <button onClick={handleNew} className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            New sequence
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border-default bg-panel">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-default bg-surface text-[11px] uppercase tracking-wide text-text-meta">
              <th className="px-3 py-2 text-left font-medium">Sequence</th>
              <th className="px-3 py-2 text-right font-medium">Steps</th>
              <th className="px-3 py-2 text-right font-medium">Enrolled</th>
              <th className="px-3 py-2 text-right font-medium">Open</th>
              <th className="px-3 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sequences.map((s) => (
              <tr key={s.id} className="border-t border-border-subtle hover:bg-raised">
                <td className="px-3 py-2.5">
                  <Link to={`/sequences/${s.id}`} className="flex items-center gap-2 font-medium text-text-secondary hover:text-text-primary">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="6" y1="3" x2="6" y2="15" />
                      <circle cx="18" cy="6" r="3" />
                      <circle cx="6" cy="18" r="3" />
                      <path d="M18 9a9 9 0 0 1-9 9" />
                    </svg>
                    {s.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{s.stepCount ?? 0}</td>
                <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{s.enrolledCount ?? 0}</td>
                <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{s.openCount ?? 0}</td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      s.hasActiveEnrollments ? 'border-success/25 bg-success/10 text-success' : 'border-text-muted/25 bg-text-muted/10 text-text-muted'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {s.hasActiveEnrollments ? 'Active' : 'Idle'}
                  </span>
                </td>
              </tr>
            ))}
            {sequences.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                  No sequences yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
