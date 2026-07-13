import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listTemplates, type Template } from '../lib/templatesApi';

export function TemplatesList() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">Templates</h1>
          <p className="mt-1 text-xs text-text-muted">Reusable email content with spintax and personalization tokens.</p>
        </div>
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

      {!loading && templates.length === 0 ? (
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
                <th className="px-3.5 py-2 text-left font-medium">Template</th>
                <th className="px-3 py-2 text-left font-medium">Folder</th>
                <th className="px-3 py-2 text-right font-medium">Uses</th>
                <th className="px-3 py-2 text-right font-medium">Open rate</th>
                <th className="px-3.5 py-2 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="cursor-pointer border-t border-border-subtle hover:bg-raised" onClick={() => navigate(`/templates/${t.id}`)}>
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
                  <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{(t.openRatePct ?? 0).toFixed(1)}%</td>
                  <td className="px-3.5 py-2.5 text-right text-text-muted">{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
