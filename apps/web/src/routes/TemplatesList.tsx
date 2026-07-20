import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listTemplates, deleteTemplate, deleteTemplates, type Template } from '../lib/templatesApi';
import { TableSkeleton } from '../components/skeletons';
import { CloseIcon } from '../components/icons';
import { useAuthStore } from '../stores/useAuthStore';

export function TemplatesList() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const navigate = useNavigate();
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This also removes all its variants.`)) return;
    setDeleting(id);
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(null);
    }
  }

  function handleSelectAll() {
    if (selected.size === templates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(templates.map((t) => t.id)));
    }
  }

  function handleSelectOne(id: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Delete ${count} template${count === 1 ? '' : 's'}? This also removes all their variants.`)) return;
    setBulkDeleting(true);
    try {
      await deleteTemplates(Array.from(selected));
      setTemplates((prev) => prev.filter((t) => !selected.has(t.id)));
      setSelected(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk delete failed.');
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Templates</h1>
          <p className="mt-1 text-xs text-text-muted">Reusable email content with spintax and personalization tokens.</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && canWrite && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex h-8 items-center gap-1.5 rounded-md bg-danger px-3 text-xs font-semibold text-white hover:bg-danger-hover disabled:opacity-40"
            >
              {bulkDeleting ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14" />
                </svg>
              )}
              Delete {selected.size}
            </button>
          )}
          <button
            onClick={() => navigate('/templates/new')}
            className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            New template
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-emphasis bg-panel px-5 py-16 text-center">
          <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-border-strong bg-raised2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
              <path d="M14 2v5h5" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
          </div>
          <h3 className="mb-1.5 text-base font-semibold text-text-primary">No templates yet</h3>
          <p className="mb-4 max-w-[360px] text-[13px] leading-relaxed text-text-muted">
            Templates hold your outreach copy — with <b className="text-[#A5B4FC]">{'{option A|option B}'}</b> spintax and{' '}
            <b className="text-accent-light">{'{{tokens}}'}</b> that resolve per contact.
          </p>
          <button
            onClick={() => navigate('/templates/new')}
            className="h-[34px] rounded-md bg-accent px-3.5 text-[13px] font-semibold text-white hover:bg-accent-hover"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-default bg-surface text-[11px] uppercase tracking-wide text-text-meta">
                {canWrite && (
                  <th className="w-10 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selected.size === templates.length && templates.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border border-border-emphasis"
                    />
                  </th>
                )}
                <th className="px-3.5 py-2 text-left font-medium">Template</th>
                <th className="px-3 py-2 text-left font-medium">Folder</th>
                <th className="px-3 py-2 text-right font-medium">Uses</th>
                <th className="px-3 py-2 text-right font-medium">Used in</th>
                <th className="px-3 py-2 text-right font-medium">Open rate</th>
                <th className="px-3.5 py-2 text-right font-medium">Updated</th>
                {canWrite && <th className="w-10 px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="cursor-pointer border-t border-border-subtle hover:bg-raised" onClick={() => navigate(`/templates/${t.id}`)}>
                  {canWrite && (
                    <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => handleSelectOne(t.id)}
                        className="rounded border border-border-emphasis"
                      />
                    </td>
                  )}
                  <td className="px-3.5 py-2.5">
                    <Link to={`/templates/${t.id}`} className="font-medium text-text-secondary hover:text-text-primary" onClick={(e) => e.stopPropagation()}>
                      {t.name}
                    </Link>
                    <div className="mt-0.5 truncate font-mono text-[11.5px] text-text-faint">{t.subject || 'no subject'}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    {t.folder ? (
                      <span className="rounded border border-border-emphasis bg-raised2 px-1.5 py-0.5 text-[11px] text-text-quaternary">{t.folder}</span>
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{t.uses ?? 0}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">
                    {t.usedInCount ? `${t.usedInCount} seq${t.usedInCount === 1 ? '' : 's'}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{(t.openRatePct ?? 0).toFixed(1)}%</td>
                  <td className="px-3.5 py-2.5 text-right text-text-muted">{new Date(t.updatedAt).toLocaleDateString()}</td>
                  {canWrite && (
                    <td className="px-2 py-2.5 text-right">
                      <button
                        onClick={(e) => handleDelete(e, t.id, t.name)}
                        disabled={deleting === t.id}
                        title="Delete template"
                        className="rounded p-1 text-text-faint hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                      >
                        {deleting === t.id ? (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <CloseIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
