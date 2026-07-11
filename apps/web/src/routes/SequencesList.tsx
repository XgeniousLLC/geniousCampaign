import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSequence, listSequences, listSteps, type Sequence } from '../lib/sequencesApi';

export function SequencesList() {
  const [sequences, setSequences] = useState<(Sequence & { stepCount: number })[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    listSequences().then(async (seqs) => {
      const withCounts = await Promise.all(
        seqs.map(async (s) => ({ ...s, stepCount: (await listSteps(s.id)).length })),
      );
      setSequences(withCounts);
    });
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
        <button onClick={handleNew} className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover">
          New sequence
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-border-default bg-panel">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-default bg-surface text-[11px] uppercase tracking-wide text-text-meta">
              <th className="px-3 py-2 text-left font-medium">Sequence</th>
              <th className="px-3 py-2 text-right font-medium">Steps</th>
            </tr>
          </thead>
          <tbody>
            {sequences.map((s) => (
              <tr key={s.id} className="border-t border-border-subtle hover:bg-raised">
                <td className="px-3 py-2.5">
                  <Link to={`/sequences/${s.id}`} className="font-medium text-text-secondary hover:text-text-primary">
                    {s.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{s.stepCount}</td>
              </tr>
            ))}
            {sequences.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-8 text-center text-text-muted">
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
