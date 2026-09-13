import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getOverview,
  getTrend,
  getRecentCampaigns,
  getRecentActivity,
  getTodayStats,
  getDashboardSummary,
  type AnalyticsOverview,
  type TrendPoint,
  type RecentCampaign,
  type RecentActivityItem,
  type TodayStats,
  type DashboardSummary,
} from '../lib/analyticsApi';

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-text-muted/10 text-text-muted border-text-muted/25',
  sending: 'bg-info/10 text-info border-info/25',
  sent: 'bg-success/10 text-success border-success/25',
  failed: 'bg-danger/10 text-danger border-danger/25',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-md border border-border-default bg-panel p-3.5">
      <div className="text-xs font-medium text-text-muted">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold leading-none tracking-tight text-text-heading">{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-text-faint">{sub}</div>}
    </div>
  );
}

function TodayStatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-md border border-border-default bg-panel p-3.5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accent ?? 'bg-accent'}`} />
        <div className="text-xs font-medium text-text-muted">{label}</div>
      </div>
      <div className="mt-2 font-mono text-xl font-semibold leading-none tracking-tight text-text-heading">{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-text-faint">{sub}</div>}
    </div>
  );
}

function MiniStatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border-default bg-panel px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-text-muted">{label}</div>
        <div className="mt-0.5 font-mono text-lg font-semibold leading-none tracking-tight text-text-heading">{value}</div>
      </div>
    </div>
  );
}

/** Area chart with gradient fill — replaces the old polyline-only line chart. */
function EngagementChart({ data }: { data: TrendPoint[] }) {
  const width = 760;
  const height = 200;
  const gradientIdOpens = 'grad-opens';
  const gradientIdClicks = 'grad-clicks';

  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-xs text-text-faint">No engagement data yet.</div>;
  }

  const maxValue = Math.max(1, ...data.map((d) => Math.max(d.opens, d.clicks)));
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const baseline = height - 10;
  const chartHeight = height - 30;

  const toPath = (key: 'opens' | 'clicks') => {
    const pts = data.map((d, i) => ({ x: i * stepX, y: baseline - (d[key] / maxValue) * chartHeight }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x},${baseline} L0,${baseline} Z`;
    return { line, area };
  };

  const opens = toPath('opens');
  const clicks = toPath('clicks');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-[200px] w-full">
      <defs>
        <linearGradient id={gradientIdOpens} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818CF8" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#818CF8" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={gradientIdClicks} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34D399" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" y1={height * f} x2={width} y2={height * f} stroke="#1A1D23" strokeWidth="1" />
      ))}
      {/* Area fills */}
      <path d={opens.area} fill={`url(#${gradientIdOpens})`} />
      <path d={clicks.area} fill={`url(#${gradientIdClicks})`} />
      {/* Lines */}
      <path d={opens.line} fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={clicks.line} fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots at data points (opens only, to avoid clutter) */}
      {data.map((d, i) => {
        const cx = i * stepX;
        const cy = baseline - (d.opens / maxValue) * chartHeight;
        return <circle key={i} cx={cx} cy={cy} r="2.5" fill="#818CF8" />;
      })}
      {data.map((d, i) => {
        const cx = i * stepX;
        const cy = baseline - (d.clicks / maxValue) * chartHeight;
        return <circle key={`c-${i}`} cx={cx} cy={cy} r="2.5" fill="#34D399" />;
      })}
    </svg>
  );
}

export function Dashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [today, setToday] = useState<TodayStats | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    getOverview(30).then(setOverview);
    getTodayStats().then(setToday);
    getDashboardSummary().then(setSummary);
    getTrend(30).then(setTrend);
    getRecentCampaigns(5).then(setRecentCampaigns);
    getRecentActivity(10).then(setActivity);
  }, []);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Dashboard</h1>
          <p className="mt-1 text-xs text-text-muted">Sending overview across all campaigns and sequences.</p>
        </div>
        <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border-strong bg-field px-2.5 text-xs font-medium text-text-tertiary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Last 30 days
        </div>
      </div>

      {/* Summary row */}
      <div className="mb-3.5 grid grid-cols-5 gap-3">
        <MiniStatCard
          label="Contacts"
          value={summary?.contactCount ?? '—'}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <MiniStatCard
          label="Campaigns"
          value={summary?.campaignCount ?? '—'}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          }
        />
        <MiniStatCard
          label="Active sequences"
          value={summary?.activeSequenceCount ?? '—'}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <MiniStatCard
          label="Lists"
          value={summary?.listCount ?? '—'}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          }
        />
        <MiniStatCard
          label="Active enrollments"
          value={summary?.activeEnrollmentCount ?? '—'}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>

      {/* 30-day overview stats */}
      <div className="mb-3.5 grid grid-cols-4 gap-3">
        <StatCard label="Sent" value={overview?.sentCount ?? '—'} sub={`${overview?.totalCount ?? 0} total attempts`} />
        <StatCard label="Open rate" value={overview ? `${overview.openRatePct.toFixed(1)}%` : '—'} sub={`${overview?.openCount ?? 0} opens`} />
        <StatCard label="Click rate" value={overview ? `${overview.clickRatePct.toFixed(1)}%` : '—'} sub={`${overview?.clickCount ?? 0} clicks`} />
        <StatCard label="Bounce rate" value={overview ? `${overview.bounceRatePct.toFixed(1)}%` : '—'} sub={`${overview?.bouncedCount ?? 0} bounced`} />
      </div>

      {/* Today's stats */}
      <div className="mb-3.5 rounded-md border border-border-default bg-panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/15">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-accent">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-text-primary">Today</h3>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <TodayStatCard label="Sent" value={today?.sentCount ?? 0} sub={`${today?.totalCount ?? 0} attempts`} accent="bg-accent" />
          <TodayStatCard label="Opens" value={today?.openCount ?? 0} sub={today ? `${today.openRatePct.toFixed(1)}% rate` : '—'} accent="bg-[#818CF8]" />
          <TodayStatCard label="Clicks" value={today?.clickCount ?? 0} sub={today ? `${today.clickRatePct.toFixed(1)}% rate` : '—'} accent="bg-success" />
          <TodayStatCard label="Bounced" value={today?.bouncedCount ?? 0} sub={today ? `${today.bounceRatePct.toFixed(1)}% rate` : '—'} accent="bg-danger" />
          <TodayStatCard label="Failed" value={today?.failedCount ?? 0} accent="bg-warning" />
        </div>
      </div>

      {/* Engagement over time */}
      <div className="mb-3.5 rounded-md border border-border-default bg-panel p-4">
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Engagement over time</h3>
          <div className="flex items-center gap-3.5 text-[11.5px] text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-2.5 rounded bg-[#818CF8]" /> Opens
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-2.5 rounded bg-success" /> Clicks
            </span>
          </div>
        </div>
        <EngagementChart data={trend} />
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-3">
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">Recent campaigns</h3>
            <Link to="/campaigns" className="text-xs font-medium text-accent-light hover:text-accent">
              View all
            </Link>
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-text-meta">
                <th className="px-4 py-2 font-medium">Campaign</th>
                <th className="px-2.5 py-2 text-right font-medium">Sent</th>
                <th className="px-2.5 py-2 text-right font-medium">Open</th>
                <th className="px-2.5 py-2 text-right font-medium">Click</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentCampaigns.map((c) => (
                <tr key={c.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2.5">
                    <Link to={`/campaigns/${c.id}`} className="font-medium text-text-secondary hover:text-text-primary">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-mono text-text-tertiary">{c.sentCount}</td>
                  <td className="px-2.5 py-2.5 text-right font-mono text-text-tertiary">{c.openCount}</td>
                  <td className="px-2.5 py-2.5 text-right font-mono text-text-tertiary">{c.clickCount}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CAMPAIGN_STATUS_STYLES[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentCampaigns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                    No campaigns yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border-default bg-panel p-3.5">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Recent activity</h3>
          <div className="flex flex-col gap-0.5">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-2.5 py-1.5">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${a.type === 'click' ? 'bg-success' : 'bg-info'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs leading-snug text-text-tertiary">
                    {a.type === 'click' ? 'Click' : 'Open'} on <span className="text-text-secondary">{a.campaignName ?? 'sequence send'}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-faint">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {activity.length === 0 && <div className="text-xs text-text-faint">No activity yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
