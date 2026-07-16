import { useEffect, useRef, useState, type DragEvent } from 'react';
import {
  getImportStatus,
  uploadContactsCsv,
  listLists,
  listTags,
  createList,
  createTag,
  type ImportStatus,
  type ImportProgress,
  type ColumnTarget,
  type List,
  type Tag,
} from '../lib/contactsApi';
import { previewCsv, guessColumnTarget, type CsvPreview } from '../lib/csvPreview';
import { CloseIcon } from './icons';

type Step = 'pick' | 'map' | 'progress' | 'done';

const TARGET_LABELS: Record<ColumnTarget, string> = {
  email: 'Email',
  firstName: 'First name',
  lastName: 'Last name',
  fullName: 'Full name (split into first/last)',
  custom: 'Custom field',
  ignore: 'Ignore this column',
};

function isProgressObject(p: ImportProgress | number | undefined): p is ImportProgress {
  return typeof p === 'object' && p !== null;
}

export function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, ColumnTarget>>({});
  const [lists, setLists] = useState<List[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    listLists().then(setLists);
    listTags().then(setTags);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  async function handleFile(f: File | null) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a .csv file.');
      return;
    }
    setFile(f);
    setError(null);
    const p = await previewCsv(f);
    setPreview(p);
    const initialMapping: Record<string, ColumnTarget> = {};
    for (const h of p.headers) initialMapping[h.trim().toLowerCase()] = guessColumnTarget(h);
    setMapping(initialMapping);
    setStep('map');
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleCreateList() {
    if (!newListName.trim()) return;
    const created = await createList({ name: newListName.trim() });
    setLists((prev) => [created, ...prev]);
    setSelectedListId(created.id);
    setNewListName('');
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    const created = await createTag({ name: newTagName.trim() });
    setTags((prev) => [created, ...prev]);
    setSelectedTagIds((prev) => [...prev, created.id]);
    setNewTagName('');
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function poll(jobId: string) {
    async function tick() {
      const s = await getImportStatus(jobId);
      setStatus(s);
      if (s.state === 'completed' || s.state === 'failed') {
        if (pollRef.current) window.clearInterval(pollRef.current);
        if (s.state === 'completed') onImported();
      }
    }
    tick();
    pollRef.current = window.setInterval(tick, 1000);
  }

  async function startImport() {
    if (!file) return;
    if (!Object.values(mapping).includes('email')) {
      setError('Map at least one column to "Email" before importing.');
      return;
    }
    setError(null);
    setStep('progress');
    try {
      const { jobId } = await uploadContactsCsv(file, { columnMapping: mapping, listId: selectedListId || undefined, tagIds: selectedTagIds });
      setStatus({ jobId, state: 'waiting', progress: 0 });
      poll(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('map');
    }
  }

  const progress = status?.progress;
  const percent = isProgressObject(progress) ? progress.percent : (progress ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-[640px] max-w-full flex-col overflow-hidden rounded-xl border border-border-modal bg-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <h3 className="text-sm font-semibold text-text-heading">Import contacts</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-[180px] flex-1 overflow-y-auto px-4 py-5">
          {step === 'pick' && (
            <div
              onClick={() => fileInput.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`cursor-pointer rounded-lg border border-dashed p-8 text-center transition-colors ${
                isDragging ? 'border-accent bg-accent/10' : 'border-border-emphasis bg-surface'
              }`}
            >
              <div className="mb-1 text-sm font-semibold text-text-primary">Drop your CSV here</div>
              <div className="text-xs text-text-muted">or click to browse — any column layout works, you'll map columns next</div>
              <input
                ref={fileInput}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {step === 'map' && preview && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="mb-2 text-xs font-semibold text-text-secondary">Map your columns</div>
                <div className="overflow-hidden rounded-md border border-border-default">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border-default bg-surface text-[10.5px] uppercase tracking-wide text-text-meta">
                        <th className="px-3 py-2 text-left font-medium">CSV column</th>
                        <th className="px-3 py-2 text-left font-medium">Sample</th>
                        <th className="px-3 py-2 text-left font-medium">Maps to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.headers.map((h, i) => {
                        const key = h.trim().toLowerCase();
                        return (
                          <tr key={key} className="border-t border-border-subtle">
                            <td className="px-3 py-2 font-mono text-text-secondary">{h}</td>
                            <td className="max-w-[140px] truncate px-3 py-2 text-text-faint">{preview.sampleRow[i] ?? ''}</td>
                            <td className="px-3 py-2">
                              <select
                                value={mapping[key] ?? 'ignore'}
                                onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value as ColumnTarget }))}
                                className="h-7 rounded border border-border-default bg-field px-1.5 text-[11px] text-text-primary"
                              >
                                {(Object.keys(TARGET_LABELS) as ColumnTarget[]).map((t) => (
                                  <option key={t} value={t}>
                                    {TARGET_LABELS[t]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs font-semibold text-text-secondary">Add to list (optional)</div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="h-8 flex-1 rounded-md border border-border-default bg-field px-2 text-xs text-text-primary"
                  >
                    <option value="">No list</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="New list name"
                    className="h-8 flex-1 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint"
                  />
                  <button
                    onClick={handleCreateList}
                    disabled={!newListName.trim()}
                    className="h-8 shrink-0 rounded-md border border-border-default bg-panel px-2.5 text-xs font-medium text-text-secondary hover:bg-raised disabled:opacity-40"
                  >
                    + Create list
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs font-semibold text-text-secondary">Add tags (optional)</div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => {
                    const selected = selectedTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          selected ? '' : 'border-border-default text-text-tertiary hover:bg-raised'
                        }`}
                        style={selected ? { borderColor: t.color, backgroundColor: `${t.color}22`, color: t.color } : undefined}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </button>
                    );
                  })}
                  {tags.length === 0 && <span className="text-[11px] text-text-faint">No tags yet.</span>}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="New tag name"
                    className="h-8 flex-1 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint"
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="h-8 shrink-0 rounded-md border border-border-default bg-panel px-2.5 text-xs font-medium text-text-secondary hover:bg-raised disabled:opacity-40"
                  >
                    + Create tag
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'progress' && (
            <div className="py-4 text-center">
              <div className="mb-3 text-xs text-text-muted">Importing contacts…</div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-border-default">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
              </div>
              <div className="mb-3 font-mono text-xs text-text-faint">{percent}%</div>
              {isProgressObject(progress) && (
                <div className="flex justify-center gap-4 text-xs text-text-muted">
                  <span>
                    <span className="font-mono text-text-primary">{progress.processed}</span> / {progress.total} rows
                  </span>
                  <span>
                    <span className="font-mono text-success">{progress.created}</span> created
                  </span>
                  <span>
                    <span className="font-mono text-info">{progress.duplicates}</span> duplicates
                  </span>
                  <span>
                    <span className="font-mono text-danger">{progress.invalid}</span> invalid
                  </span>
                </div>
              )}
            </div>
          )}

          {status?.state === 'completed' && status.result && (
            <div>
              <div className="mb-3 flex items-center gap-2 rounded-md border border-success/25 bg-success/10 px-3 py-2 text-xs text-text-secondary">
                <span className="font-semibold text-success">{status.result.created} new contacts imported.</span>
              </div>
              <div className="mb-3 flex gap-4 text-xs text-text-muted">
                <span>
                  <span className="font-mono text-text-primary">{status.result.totalRows}</span> total rows
                </span>
                <span>
                  <span className="font-mono text-success">{status.result.created}</span> created
                </span>
                <span>
                  <span className="font-mono text-info">{status.result.duplicates}</span> duplicates (updated)
                </span>
                <span>
                  <span className="font-mono text-danger">{status.result.invalid}</span> invalid
                </span>
              </div>
              {status.result.issues.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border border-border-default">
                  {status.result.issues.map((issue, i) => (
                    <div key={i} className="border-t border-border-subtle px-2 py-1 text-[11px] first:border-t-0">
                      <span className="font-mono text-text-faint">row {issue.row}</span>{' '}
                      <span className="text-danger">{issue.reason}</span>
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
          {step === 'map' && (
            <>
              <button
                onClick={() => {
                  setStep('pick');
                  setFile(null);
                  setPreview(null);
                }}
                className="h-8 rounded-md border border-border-subtle px-3 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Back
              </button>
              <button onClick={startImport} className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-hover">
                Start import
              </button>
            </>
          )}
          {status?.state === 'completed' && (
            <button onClick={onClose} className="h-8 rounded-md bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-hover">
              Done
            </button>
          )}
          {status?.state === 'failed' && (
            <button onClick={onClose} className="h-8 rounded-md border border-border-subtle px-3.5 text-xs font-medium text-text-secondary hover:bg-raised">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
