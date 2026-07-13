import { EMAIL_TEMPLATE_LIBRARY, type LibraryTemplate } from '../lib/emailTemplateLibrary';

export function TemplateLibraryModal({
  onPick,
  onBlank,
}: {
  onPick: (template: LibraryTemplate) => void;
  onBlank: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6">
      <div className="w-[640px] max-w-full rounded-xl border border-border-modal bg-panel2 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-text-heading">Start from a template</h3>
            <p className="mt-0.5 text-xs text-text-muted">Prebuilt starters — fully editable, nothing sends until you save and use it.</p>
          </div>
          <button onClick={onBlank} className="text-xs font-medium text-text-muted hover:text-text-primary">
            Skip, start blank
          </button>
        </div>

        <div className="grid max-h-[440px] grid-cols-2 gap-2.5 overflow-y-auto p-[18px]">
          {EMAIL_TEMPLATE_LIBRARY.map((t) => (
            <button
              key={t.slug}
              onClick={() => onPick(t)}
              className="rounded-lg border border-border-subtle bg-surface p-3.5 text-left hover:border-accent/50 hover:bg-raised"
            >
              <div className="text-sm font-semibold text-text-primary">{t.name}</div>
              <div className="mt-1 text-xs text-text-muted">{t.desc}</div>
              <div className="mt-2 truncate text-[11px] font-medium text-accent-light">{t.subject}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
