import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

interface HealthResponse {
  status: string;
}

export function Dashboard() {
  const [health, setHealth] = useState<string>('checking...');

  useEffect(() => {
    apiGet<HealthResponse>('/health')
      .then((res) => setHealth(res.status))
      .catch(() => setHealth('unreachable'));
  }, []);

  return (
    <div className="rounded-md border border-border-default bg-panel p-6">
      <h1 className="text-lg font-semibold text-text-heading">geniusCampaign</h1>
      <p className="mt-2 text-sm text-text-secondary">
        API health: <span className="font-mono text-accent-light">{health}</span>
      </p>
    </div>
  );
}
