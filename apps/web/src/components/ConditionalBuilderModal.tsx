import { useState } from 'react';

export interface ConditionalInsert {
  text: string;
}

const FIELD_OPTIONS = [
  { value: 'contact.firstName', label: 'First name — {{contact.firstName}}' },
  { value: 'contact.lastName', label: 'Last name — {{contact.lastName}}' },
  { value: 'contact.email', label: 'Email — {{contact.email}}' },
  { value: '__custom__', label: 'Custom field — {{contact.custom.*}} / bare key' },
];

const OPERATOR_OPTIONS = [
  { value: '==', label: 'equals (==)' },
  { value: '!=', label: 'not equals (!=)' },
  { value: 'is_set', label: 'is set / not empty' },
  { value: 'is_not_set', label: 'is not set / empty' },
];

function buildCondition(field: string, operator: string, value: string): string {
  const f = field.trim();
  if (!f) return '';
  if (operator === 'is_set') return f;
  if (operator === 'is_not_set') return `${f} == ""`;
  const v = value.trim();
  // Auto-quote value if not already quoted (covers bare strings like pricing)
  const quoted = v.startsWith('"') || v.startsWith("'") ? v : `"${v.replace(/"/g, '\\"')}"`;
  return `${f} ${operator} ${quoted}`;
}

export function ConditionalBuilderModal({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (text: string) => void;
}) {
  const [fieldChoice, setFieldChoice] = useState('contact.firstName');
  const [customKey, setCustomKey] = useState('checkout_source');
  const [operator, setOperator] = useState('==');
  const [value, setValue] = useState('pricing');
  const [thenContent, setThenContent] = useState('https://taskip.net/checkout?source=pricing&planId={{contact.custom.plan_id}}&billing={{contact.custom.plan_billing}}');
  const [elseContent, setElseContent] = useState('https://taskip.net/checkout?source=offer&planId={{contact.custom.plan_id}}&installment={{contact.custom.plan_billing}}');
  const [includeElse, setIncludeElse] = useState(true);

  const effectiveField = fieldChoice === '__custom__' ? customKey.trim() : fieldChoice;
  const condition = buildCondition(effectiveField || 'contact.firstName', operator, value);
  const preview =
    `{{#if ${condition || 'field == "value"}'}}` +
    thenContent +
    (includeElse ? `{{else}}${elseContent}` : '') +
    `{{/if}}`;

  const canInsert = effectiveField.length > 0 && (operator === 'is_set' || operator === 'is_not_set' || value.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="w-[560px] max-w-full rounded-xl border border-border-modal bg-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <h3 className="text-sm font-semibold text-text-heading">Insert condition</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 p-[18px]">
          <div className="text-[11px] leading-snug text-text-faint">
            Inserts a <span className="font-mono text-text-secondary">{'{{#if}}'}</span> block. The chosen branch is kept at send time; the other is discarded.
            Field names like <span className="font-mono text-text-secondary">checkout_source</span> read from <span className="font-mono text-text-secondary">contact.custom.*</span> — use the Custom field option for your checkout/plan keys.
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Field</label>
              <select
                value={fieldChoice}
                onChange={(e) => setFieldChoice(e.target.value)}
                className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary outline-none focus:border-accent"
              >
                {FIELD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {fieldChoice === '__custom__' && (
                <input
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="e.g. checkout_source, plan_id, plan_billing"
                  className="mt-2 h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 font-mono text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
                />
              )}
              {fieldChoice === '__custom__' && customKey.trim() && (
                <div className="mt-1 font-mono text-[11px] text-text-faint">
                  Reads <span className="text-text-secondary">{'{{contact.custom.' + customKey.trim() + '}}'}</span> — bare{' '}
                  <span className="text-text-secondary">{customKey.trim()}</span> works too (shorthand).
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Condition</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary outline-none focus:border-accent"
                >
                  {OPERATOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Value</label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder='e.g. pricing'
                  disabled={operator === 'is_set' || operator === 'is_not_set'}
                  className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Content if true</label>
            <textarea
              value={thenContent}
              onChange={(e) => setThenContent(e.target.value)}
              rows={2}
              placeholder="Shown when condition matches"
              className="w-full rounded-md border border-border-subtle bg-surface px-2.5 py-2 font-mono text-xs text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <input type="checkbox" checked={includeElse} onChange={(e) => setIncludeElse(e.target.checked)} className="rounded border-border-subtle" />
            Include else branch
          </label>

          {includeElse && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Content if false (else)</label>
              <textarea
                value={elseContent}
                onChange={(e) => setElseContent(e.target.value)}
                rows={2}
                placeholder="Shown when condition does not match"
                className="w-full rounded-md border border-border-subtle bg-surface px-2.5 py-2 font-mono text-xs text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
              />
            </div>
          )}

          <div className="rounded-md border border-border-subtle bg-surface px-3 py-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-text-meta">Preview (what will be inserted)</div>
            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-text-secondary">{preview}</pre>
            <div className="mt-2 text-[11px] leading-snug text-text-faint">
              Example from your request: set Field to Custom <span className="font-mono text-text-secondary">checkout_source</span>, Condition to equals, Value to{' '}
              <span className="font-mono text-text-secondary">pricing</span>, then/else to the two checkout URLs.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <button
            onClick={onClose}
            className="h-[34px] rounded-md border border-border-subtle bg-surface px-3.5 text-sm font-medium text-text-secondary hover:bg-raised"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!canInsert) return;
              onInsert(preview);
              onClose();
            }}
            disabled={!canInsert}
            className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
