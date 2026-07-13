import { useState } from 'react';

export interface PromptField {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}

// In-app replacement for window.prompt() — native browser prompts block all
// further page events (including this app's own browser-automation testing)
// and can't be styled, so every editor "insert X" flow that used to call
// prompt() twice in a row goes through this instead.
export function PromptDialog({
  title,
  fields,
  submitLabel = 'Insert',
  onSubmit,
  onClose,
  onRemove,
}: {
  title: string;
  fields: PromptField[];
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ''])),
  );

  function submit() {
    onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="w-[420px] max-w-full rounded-xl border border-border-modal bg-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <h3 className="text-sm font-semibold text-text-heading">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-[18px]">
          {fields.map((f, i) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">{f.label}</label>
              <input
                autoFocus={i === 0}
                value={values[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          {onRemove ? (
            <button onClick={onRemove} className="text-xs font-medium text-danger hover:text-danger/80">
              Remove
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-[34px] rounded-md border border-border-subtle bg-surface px-3.5 text-sm font-medium text-text-secondary hover:bg-raised"
            >
              Cancel
            </button>
            <button onClick={submit} className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover">
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
