import { useRef, useState } from 'react';
import { getImportStatus, uploadContactsCsv, type ImportStatus } from '../lib/contactsApi';

export function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  function poll(jobId: string) {
    pollRef.current = window.setInterval(async () => {
      const s = await getImportStatus(jobId);
      setStatus(s);
      if (s.state === 'completed' || s.state === 'failed') {
        if (pollRef.current) window.clearInterval(pollRef.current);
        if (s.state === 'completed') onImported();
      }
    }, 500);
  }

  async function startUpload() {
    if (!file) return;
    setError(null);
    try {
      const { jobId } = await uploadContactsCsv(file);
      setStatus({ jobId, state: 'waiting', progress: 0 });
      poll(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="w-[520px] max-w-full overflow-hidden rounded-xl border border-border-modal bg-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <h3 className="text-sm font-semibold text-text-heading">Import contacts</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>

        <div className="min-h-[180px] px-4 py-5">
          {!status && (
            <div
              onClick={() => fileInput.current?.click()}
              className="cursor-pointer rounded-lg border border-dashed border-border-emphasis bg-surface p-8 text-center"
            >
              <div className="mb-1 text-sm font-semibold text-text-primary">
                {file ? file.name : 'Drop your CSV here'}
              </div>
              <div className="text-xs text-text-muted">or click to browse — requires an `email` column</div>
              <input
                ref={fileInput}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {status && status.state !== 'completed' && status.state !== 'failed' && (
            <div className="py-4 text-center">
              <div className="mb-3 text-xs text-text-muted">Importing contacts…</div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-border-default">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${status.progress}%` }} />
              </div>
              <div className="font-mono text-xs text-text-faint">{status.progress}%</div>
            </div>
          )}

          {status?.state === 'completed' && status.result && (
            <div>
              <div className="mb-3 flex items-center gap-2 rounded-md border border-success/25 bg-success/10 px-3 py-2 text-xs text-text-secondary">
                <span className="font-semibold text-success">
                  {status.result.created + status.result.updated} contacts imported.
                </span>
                {status.result.errors.length > 0 && <span>{status.result.errors.length} rows had errors.</span>}
              </div>
              <div className="flex gap-4 text-xs text-text-muted">
                <span>
                  <span className="font-mono text-text-primary">{status.result.created}</span> created
                </span>
                <span>
                  <span className="font-mono text-text-primary">{status.result.updated}</span> updated
                </span>
              </div>
              {status.result.errors.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto rounded-md border border-border-default">
                  {status.result.errors.map((e, i) => (
                    <div key={i} className="border-t border-border-subtle px-2 py-1 text-[11px] first:border-t-0">
                      <span className="font-mono text-text-faint">row {e.row}</span>{' '}
                      <span className="text-danger">{e.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {status?.state === 'failed' && (
            <div className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">
              Import failed: {status.failedReason}
            </div>
          )}

          {error && <div className="mt-2 text-xs text-danger">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-4 py-3">
          {!status && (
            <button
              onClick={startUpload}
              disabled={!file}
              className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
            >
              Upload
            </button>
          )}
          {status?.state === 'completed' && (
            <button onClick={onClose} className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-hover">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
