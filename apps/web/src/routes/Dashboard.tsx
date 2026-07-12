import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getOverview,
  getTrend,
  getRecentCampaigns,
  getRecentActivity,
  type AnalyticsOverview,
  type TrendPoint,
  type RecentCampaign,
  type RecentActivityItem,
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

/** A minimal hand-rolled SVG line chart — no charting library dependency
 * for a 30-point trend line. */
function TrendChart({ data }: { data: TrendPoint[] }) {
  const width = 760;
  const height = 190;
  if (data.length === 0) {
    return <div className="flex h-[190px] items-center justify-center text-xs text-text-faint">No engagement data yet.</div>;
  }

  const maxValue = Math.max(1, ...data.map((d) => Math.max(d.opens, d.clicks)));
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = (key: 'opens' | 'clicks') =>
    data.map((d, i) => `${i * stepX},${height - (d[key] / maxValue) * (height - 20) - 10}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-[190px] w-full">
      <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#1A1D23" strokeWidth="1" />
      <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#1A1D23" strokeWidth="1" />
      <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#1A1D23" strokeWidth="1" />
      <polyline points={points('opens')} fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={points('clicks')} fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Dashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    getOverview(30).then(setOverview);
    getTrend(30).then(setTrend);
    getRecentCampaigns(5).then(setRecentCampaigns);
    getRecentActivity(10).then(setActivity);
  }, []);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-text-heading">Dashboard</h1>
        <p className="mt-1 text-xs text-text-muted">Sending overview across all campaigns and sequences — last 30 days.</p>
      </div>

      <div className="mb-3.5 grid grid-cols-4 gap-3">
        <StatCard label="Sent" value={overview?.sentCount ?? '—'} sub={`${overview?.totalCount ?? 0} total attempts`} />
        <StatCard label="Open rate" value={overview ? `${overview.openRatePct.toFixed(1)}%` : '—'} sub={`${overview?.openCount ?? 0} opens`} />
        <StatCard label="Click rate" value={overview ? `${overview.clickRatePct.toFixed(1)}%` : '—'} sub={`${overview?.clickCount ?? 0} clicks`} />
        <StatCard label="Bounce rate" value={overview ? `${overview.bounceRatePct.toFixed(1)}%` : '—'} sub={`${overview?.bouncedCount ?? 0} bounced`} />
      </div>

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
        <TrendChart data={trend} />
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
