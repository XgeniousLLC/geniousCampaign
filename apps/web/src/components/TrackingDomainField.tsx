import { useState } from 'react';
import { verifyTrackingDomain, type SettingField } from '../lib/settingsApi';
import { API_BASE_URL } from '../lib/api';
import { CopyIcon, CheckCircleIcon } from './icons';

// Same host the frontend already calls the API on — offered as a one-click
// fill so the recommended self-host path (TrackingDomainController's
// domain === req.hostname shortcut) needs no typing. Excluded for
// localhost/IP dev hosts, which can never self-verify server-side either.
function apiHostSuggestion(): string | null {
  try {
    const host = new URL(API_BASE_URL).hostname.toLowerCase();
    if (host === 'localhost' || host === '::1' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

// TRACKING_DOMAIN can't be saved through the generic Settings > Integrations
// bulk PATCH (SettingDef.verifyOnly) — a live DNS CNAME check has to pass
// first, so a typo or a domain the admin doesn't actually control can never
// silently become the open/click tracking host.
export function TrackingDomainField({ field, onSaved }: { field: SettingField; onSaved: () => void }) {
  const [domain, setDomain] = useState(field.value ?? '');
  const [checking, setChecking] = useState(false);
  const [record, setRecord] = useState<{ type: string; host: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const suggestedHost = apiHostSuggestion();

  async function handleCheck(value?: string) {
    const target = (value ?? domain).trim();
    if (!target) {
      setError('Enter a domain first.');
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const result = await verifyTrackingDomain(target);
      if (result.verified) {
        setRecord(null);
        onSaved();
      } else {
        setRecord(result.record ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }

  function handleUseApiHost() {
    if (!suggestedHost) return;
    setDomain(suggestedHost);
    handleCheck(suggestedHost);
  }

  function handleCopyRecord() {
    if (!record) return;
    navigator.clipboard.writeText(record.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="track.yourdomain.com"
          className="h-8 w-full rounded border border-border-default bg-field px-2 text-xs text-text-primary outline-none placeholder:text-text-faint focus:border-border-emphasis"
        />
        <button
          onClick={() => handleCheck()}
          disabled={checking}
          className="h-8 shrink-0 rounded-md border border-border-default bg-panel px-3 text-xs font-medium text-text-secondary hover:bg-raised disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Check DNS'}
        </button>
      </div>

      {suggestedHost && domain.trim() !== suggestedHost && (
        <button
          onClick={handleUseApiHost}
          disabled={checking}
          className="mt-1.5 text-[11px] font-medium text-accent-light hover:underline disabled:opacity-50"
        >
          Use this app's domain ({suggestedHost}) — no DNS setup needed
        </button>
      )}

      {error && <div className="mt-2 text-[11px] text-danger">{error}</div>}

      {record && (
        <div className="mt-2 rounded-md border border-warning/25 bg-warning/10 p-2.5 text-[11.5px] text-text-secondary">
          <div className="mb-1.5 font-medium text-warning">DNS record not found yet — add this, then Check DNS again</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 font-mono text-[11px]">
            <span className="text-text-faint">Type</span>
            <span>{record.type}</span>
            <span className="text-text-faint">Host</span>
            <span className="break-all">{record.host}</span>
            <span className="text-text-faint">Value</span>
            <span className="flex items-center gap-1.5 break-all">
              {record.value}
              <button onClick={handleCopyRecord} title="Copy" className="shrink-0 text-text-faint hover:text-text-secondary">
                {copied ? <CheckCircleIcon className="text-success" /> : <CopyIcon />}
              </button>
            </span>
          </div>
          <div className="mt-1.5 text-[10.5px] text-text-faint">DNS changes can take a few minutes to a few hours to propagate.</div>
        </div>
      )}
    </div>
  );
}
