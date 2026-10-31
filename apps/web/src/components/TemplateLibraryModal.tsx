import { EMAIL_TEMPLATE_LIBRARY, type LibraryTemplate } from '../lib/emailTemplateLibrary';

export function TemplateLibraryModal({
  onPick,
  onBlank,
  onDesigned,
}: {
  onPick: (template: LibraryTemplate) => void;
  onBlank: () => void;
  onDesigned: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6">
      <div className="w-[640px] max-w-full rounded-xl border border-border-modal bg-panel2 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-text-heading">New template</h3>
            <p className="mt-0.5 text-xs text-text-muted">Design a layout, or write a plain email — nothing sends until you save and use it.</p>
          </div>
          <button onClick={onBlank} className="text-xs font-medium text-text-muted hover:text-text-primary">
            Plain email, start blank
          </button>
        </div>

        <div className="grid max-h-[440px] grid-cols-2 gap-2.5 overflow-y-auto p-[18px]">
          <button
            onClick={onDesigned}
            className="col-span-2 rounded-lg border border-accent/40 bg-accent/10 p-3.5 text-left hover:border-accent hover:bg-accent/15"
          >
            <div className="text-sm font-semibold text-text-primary">Designed email — drag &amp; drop</div>
            <div className="mt-1 text-xs text-text-muted">Rows, columns, images and buttons, starting from a gallery of layouts.</div>
          </button>
          <div className="col-span-2 mt-1 text-[11px] font-medium uppercase tracking-wide text-text-faint">Plain email starters</div>
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
