import { useRef, useState } from 'react';
import { SubjectHighlightInput, type SubjectHighlightInputHandle } from './SubjectHighlightInput';
import { PERSONALIZATION_TOKENS } from './TemplateEditorToolbar';
import { CloseIcon } from './icons';

// One row of a multi-line shuffle field (subject lines, preview-text
// lines) — the highlighted text input plus its own Spintax/Insert-token
// affordances, reused per line so both fields (and any future one) get the
// same editing capabilities without duplicating this state per caller.
export function TemplateLineField({
  value,
  onChange,
  onRemove,
  removeDisabled,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  onRemove?: () => void;
  removeDisabled?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<SubjectHighlightInputHandle>(null);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const customKeyValid = /^[a-zA-Z0-9_]+$/.test(customKey.trim());
  const [fallback, setFallback] = useState('');

  function insert(text: string) {
    inputRef.current?.insertText(text);
  }

  return (
    <div className="flex items-center gap-2">
      <SubjectHighlightInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 min-w-0 whitespace-nowrap overflow-x-auto rounded-md border border-border-subtle bg-field px-2.5 py-1.5 text-sm font-medium text-text-primary outline-none"
      />
      <button
        type="button"
        onClick={() => insert('{option A|option B}')}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded border border-accent-light/25 bg-accent-light/10 px-2 text-[11px] font-semibold text-accent-lighter hover:bg-accent-light/15"
      >
        Spintax
      </button>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setTokenOpen((o) => !o)}
          className="flex h-7 items-center gap-1.5 rounded border border-accent/25 bg-accent/10 px-2 text-[11px] font-semibold text-accent-light hover:bg-accent/15"
        >
          Insert token ▾
        </button>
        {tokenOpen && (
          <div className="absolute right-0 top-8 z-20 w-60 rounded-md border border-border-modal bg-panel2 p-1 shadow-lg">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-text-meta">Personalization tokens</div>
            {PERSONALIZATION_TOKENS.map((tk) => (
              <button
                key={tk.field}
                type="button"
                onClick={() => {
                  const fb = fallback.trim();
                  insert(`{{${tk.field}${fb ? `|${fb}` : ''}}}`);
                  setTokenOpen(false);
                }}
                className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left font-mono text-xs text-text-tertiary hover:bg-raised"
              >
                <span className="text-accent-light">{'{{'}</span>
                {tk.label}
                <span className="text-accent-light">{'}}'}</span>
              </button>
            ))}
            <div className="mt-1 border-t border-border-subtle p-2 pt-1.5">
              <div className="mb-1.5 text-[10px] uppercase tracking-wide text-text-meta">Fallback if empty</div>
              <input
                value={fallback}
                onChange={(e) => setFallback(e.target.value)}
                placeholder="e.g. there (optional)"
                className="h-7 w-full rounded border border-border-subtle bg-surface px-1.5 text-xs text-text-primary placeholder:text-text-faint"
              />
            </div>
            <div className="mt-1 border-t border-border-subtle p-2 pt-2">
              <div className="mb-1.5 text-[10px] uppercase tracking-wide text-text-meta">Custom field</div>
              <div className="flex gap-1">
                <input
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !customKeyValid) return;
                    const key = customKey.trim();
                    const fb = fallback.trim();
                    insert(`{{contact.custom.${key}${fb ? `|${fb}` : ''}}}`);
                    setCustomKey('');
                    setTokenOpen(false);
                  }}
                  placeholder="field key"
                  className="h-7 min-w-0 flex-1 rounded border border-border-subtle bg-surface px-1.5 font-mono text-xs text-text-primary placeholder:text-text-faint"
                />
                <button
                  type="button"
                  disabled={!customKeyValid}
                  onClick={() => {
                    const key = customKey.trim();
                    const fb = fallback.trim();
                    insert(`{{contact.custom.${key}${fb ? `|${fb}` : ''}}}`);
                    setCustomKey('');
                    setTokenOpen(false);
                  }}
                  className="h-7 shrink-0 rounded border border-accent/25 bg-accent/10 px-2 text-xs font-semibold text-accent-light hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          className="shrink-0 rounded px-1 text-text-faint hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
