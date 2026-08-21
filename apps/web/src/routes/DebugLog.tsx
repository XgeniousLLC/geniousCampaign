import { useEffect, useState } from 'react';
import { listDebugLog, clearDebugLog, type ErrorLogEntry } from '../lib/debugLogApi';
import { useAuthStore } from '../stores/useAuthStore';
import { PaginationBar } from '../components/PaginationBar';

const LOG_PAGE_SIZE = 20;

export function DebugLog() {
  const isOwner = useAuthStore((s) => s.user?.role === 'owner');
  const [debugLog, setDebugLog] = useState<ErrorLogEntry[]>([]);
  const [debugPage, setDebugPage] = useState(1);
  const [debugTotal, setDebugTotal] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [clearingDebugLog, setClearingDebugLog] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    listDebugLog(debugPage, LOG_PAGE_SIZE).then((res) => {
      setDebugLog(res.data);
      setDebugTotal(res.total);
    });
  }, [isOwner, debugPage]);

  function handleCopyError(e: ErrorLogEntry) {
    navigator.clipboard.writeText(e.stack ? `${e.message}\n\n${e.stack}` : e.message);
    setCopiedLogId(e.id);
    setTimeout(() => setCopiedLogId((id) => (id === e.id ? null : id)), 1500);
  }

  async function handleClearDebugLog() {
    if (!confirm('Clear all debug log entries? This cannot be undone.')) return;
    setClearingDebugLog(true);
    try {
      await clearDebugLog();
      setDebugLog([]);
      setDebugTotal(0);
      setDebugPage(1);
    } finally {
      setClearingDebugLog(false);
    }
  }

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="text-lg font-semibold text-text-heading">Debug Log</h1>
        <p className="mt-1 text-xs text-text-muted">Unexpected frontend and backend errors, captured automatically.</p>
      </div>

      {!isOwner ? (
        <div className="max-w-3xl rounded-md border border-border-default bg-panel px-4 py-6 text-center text-xs text-text-muted">
          Only owners can view the debug log.
        </div>
      ) : (
        <div className="max-w-3xl overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Debug log · {debugTotal} errors</span>
            {debugLog.length > 0 && (
              <button
                onClick={handleClearDebugLog}
                disabled={clearingDebugLog}
                className="h-7 rounded-md border border-border-default bg-panel px-2.5 text-xs font-medium text-text-secondary hover:border-danger/25 hover:text-danger disabled:opacity-50"
              >
                {clearingDebugLog ? 'Clearing…' : 'Clear logs'}
              </button>
            )}
          </div>
          {debugLog.map((e) => (
            <div key={e.id} className="border-t border-border-subtle first:border-t-0">
              <div className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-raised">
                <button
                  onClick={() => setExpandedLogId((id) => (id === e.id ? null : e.id))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                      e.source === 'backend' ? 'border-danger/25 bg-danger/10 text-danger' : 'border-warning/25 bg-warning/10 text-warning'
                    }`}
                  >
                    {e.source}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-text-secondary">{e.message}</div>
                    {e.path && <div className="truncate font-mono text-[10.5px] text-text-faint">{e.path}</div>}
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-text-faint">{new Date(e.createdAt).toLocaleString()}</span>
                </button>
                <button
                  onClick={() => handleCopyError(e)}
                  title="Copy error"
                  className="shrink-0 text-[11px] text-text-faint hover:text-text-secondary"
                >
                  {copiedLogId === e.id ? 'Copied' : 'Copy'}
                </button>
              </div>
              {expandedLogId === e.id && e.stack && (
                <pre className="overflow-x-auto whitespace-pre-wrap break-all border-t border-border-subtle bg-surface px-4 py-3 text-[10.5px] leading-relaxed text-text-faint">
                  {e.stack}
                </pre>
              )}
            </div>
          ))}
          {debugLog.length === 0 && <div className="px-4 py-6 text-center text-xs text-text-muted">No errors logged — good sign.</div>}
          {debugTotal > 0 && <PaginationBar page={debugPage} limit={LOG_PAGE_SIZE} total={debugTotal} onPageChange={setDebugPage} />}
        </div>
      )}
    </div>
  );
}
