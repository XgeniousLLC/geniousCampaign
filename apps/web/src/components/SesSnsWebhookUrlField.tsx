import { useEffect, useState } from 'react';
import { getSesSnsWebhookUrl } from '../lib/settingsApi';
import { CopyIcon, CheckCircleIcon } from './icons';

// Nothing here is saved through Settings — the URL is derived from the
// request host (mirrors TrackingDomainController's CNAME target), and SNS
// confirms its own subscription via the SubscribeURL handshake server-side,
// so there's no "Check" step the way TRACKING_DOMAIN's DNS check has one.
export function SesSnsWebhookUrlField() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getSesSnsWebhookUrl()
      .then((res) => setUrl(res.url))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function handleCopy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-text-muted">SNS subscription endpoint (HTTPS)</div>
      {error && <div className="text-[11px] text-danger">{error}</div>}
      {!error && (
        <div className="flex items-center gap-1.5 rounded-md border border-border-default bg-field px-2.5 py-2">
          <span className="flex-1 truncate font-mono text-[11.5px] text-text-secondary">{url ?? 'Loading…'}</span>
          {url && (
            <button onClick={handleCopy} title="Copy" className="shrink-0 text-text-faint hover:text-text-secondary">
              {copied ? <CheckCircleIcon className="text-success" /> : <CopyIcon />}
            </button>
          )}
        </div>
      )}
      <div className="mt-1.5 text-[10.5px] text-text-faint">
        Paste this as the HTTPS subscription endpoint on your SNS topic. See "How to configure" above for the full setup.
      </div>
    </div>
  );
}
