import { useEffect, useRef, useState } from 'react';
import { getVerificationStats, startBulkVerify, getBulkVerifyStatus, type VerificationStats, type BulkVerifyJobStatus } from '../lib/verificationApi';
import { StatCardSkeleton } from '../components/skeletons';

const STAT_CARDS: { key: keyof Omit<VerificationStats, 'total'>; label: string; color: string }[] = [
  { key: 'valid', label: 'Valid', color: '#34D399' },
  { key: 'invalid', label: 'Invalid', color: '#F87171' },
  { key: 'risky', label: 'Risky', color: '#FBBF24' },
  { key: 'unverified', label: 'Unverified', color: '#6B7280' },
];

export function Verification() {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [job, setJob] = useState<BulkVerifyJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  function loadStats() {
    getVerificationStats().then(setStats);
  }

  useEffect(() => {
    loadStats();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  function poll(jobId: string) {
    async function tick() {
      const s = await getBulkVerifyStatus(jobId);
      setJob(s);
      if (s.state === 'completed' || s.state === 'failed') {
        if (pollRef.current) window.clearInterval(pollRef.current);
        loadStats();
      }
    }
    tick();
    pollRef.current = window.setInterval(tick, 10_000);
  }

  async function handleBulkVerify() {
    setError(null);
    setJob(null);
    try {
      const { jobId } = await startBulkVerify();
      setJob({ jobId, state: 'waiting', progress: 0 });
      poll(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start bulk verify');
    }
  }

  const running = job && job.state !== 'completed' && job.state !== 'failed';

  return (
    <div>
      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Verification</h1>
          <p className="mt-1 text-xs text-text-muted">Email deliverability status across all contacts.</p>
        </div>
        <button
          onClick={handleBulkVerify}
          disabled={!!running}
          className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
          </svg>
          {running ? 'Verifying…' : `Bulk verify${stats ? ` · ${stats.unverified} pending` : ''}`}
        </button>
      </div>

      {error && <div className="mb-3 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

      {job && (
        <div className="mb-3.5 rounded-md border border-border-default bg-panel px-3.5 py-2.5 text-xs">
          {job.state === 'completed' && job.result ? (
            <div className="text-text-secondary">
              <div>
                Done — checked {job.result.checked} of {job.result.totalContacts}
                {job.result.failed > 0 && `, ${job.result.failed} failed`}
                {job.result.lastError && <span className="ml-1 text-danger">({job.result.lastError})</span>}
              </div>
              {job.result.rateLimited > 0 && (
                <div className="mt-1.5 rounded-md border border-warning/25 bg-warning/10 px-2.5 py-2 text-warning">
                  {job.result.rateLimited} of {job.result.failed} failure{job.result.failed === 1 ? '' : 's'} were the
                  verification provider rate-limiting requests (already retried automatically) — these will resolve on
                  their own. Click <span className="font-semibold">Bulk verify</span> again in a few minutes to pick
                  them back up; no action needed otherwise.
                </div>
              )}
              {job.result.failed > job.result.rateLimited && (
                <div className="mt-1.5 rounded-md border border-danger/25 bg-danger/10 px-2.5 py-2 text-danger">
                  {job.result.failed - job.result.rateLimited} failure{job.result.failed - job.result.rateLimited === 1 ? '' : 's'} were
                  not rate-limit related — check Settings &gt; Email verification (API key/quota) if this repeats.
                </div>
              )}
            </div>
          ) : job.state === 'failed' ? (
            <span className="text-danger">Bulk verify job failed{job.failedReason ? `: ${job.failedReason}` : ''}</span>
          ) : (
            <div>
              <div className="flex items-center justify-between text-text-muted">
                <span>Running… ({job.state})</span>
                <span className="font-mono">{typeof job.progress === 'number' ? job.progress : 0}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border-subtle">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${typeof job.progress === 'number' ? job.progress : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {stats === null ? (
        <div className="mb-3.5">
          <StatCardSkeleton count={4} />
        </div>
      ) : (
      <div className="mb-3.5 grid grid-cols-4 gap-3">
        {STAT_CARDS.map((card) => {
          const value = stats[card.key];
          const pct = stats.total > 0 ? (value / stats.total) * 100 : 0;
          return (
            <div key={card.key} className="rounded-md border border-border-default bg-panel p-3.5">
              <div className="text-xs text-text-muted">{card.label}</div>
              <div className="mt-1.5 font-mono text-xl font-semibold leading-none text-text-heading">{value}</div>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-border-subtle">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: card.color }} />
              </div>
            </div>
          );
        })}
      </div>
      )}

      <div className="flex max-w-[820px] items-center justify-between rounded-md border border-border-default bg-panel px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-md bg-accent/10">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M12 3v4M8 3v2M16 3v2" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-text-primary">Verification credits</div>
            <div className="text-xs text-text-muted">Reoon/NeverBounce don't expose a cheap balance-check endpoint yet</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-semibold text-text-faint">Not tracked</div>
          <div className="text-[11px] text-text-meta">no live balance available</div>
        </div>
      </div>
    </div>
  );
}
