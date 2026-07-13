import { useState } from 'react';
import { generateAiCopy, type QuickAction } from '../lib/aiAssistApi';

const QUICK_ACTIONS: { label: string; value: QuickAction }[] = [
  { label: 'Make it shorter', value: 'shorter' },
  { label: 'More casual', value: 'casual' },
  { label: 'Add a stat', value: 'stat' },
];

export function AiAssistModal({
  onClose,
  onInsert,
  context,
}: {
  onClose: () => void;
  onInsert: (text: string) => void;
  /** Current template body text (tokens/buttons as literal `{{...}}` /
   * `Label: url` text) — passed as context so "rewrite this" has something
   * to rewrite, and so quick actions can run directly on the real content. */
  context?: string;
}) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasContent = !!(result || context);

  async function run(quickAction?: QuickAction) {
    if (!quickAction && !prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { text } = await generateAiCopy({ prompt, quickAction, previousResult: result ?? undefined, context });
      setResult(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="w-[540px] max-w-full rounded-xl border border-border-modal bg-panel2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-gradient-to-br from-accent to-purple-500 text-white">✦</div>
            <h3 className="text-sm font-semibold text-text-heading">AI Assist</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>

        <div className="p-[18px]">
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">What should it say?</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              context
                ? 'e.g. Rewrite this in a more professional way'
                : 'e.g. Friendly intro to a founder about cutting manual outreach work. Casual, under 90 words.'
            }
            className="h-[70px] w-full resize-none rounded-md border border-border-subtle bg-surface p-2.5 text-sm text-text-primary placeholder:text-text-faint"
          />

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.value}
                onClick={() => run(qa.value)}
                disabled={!hasContent || loading}
                className="rounded-md border border-border-subtle bg-surface px-2.5 py-1 text-[11.5px] text-text-tertiary hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40"
              >
                {qa.label}
              </button>
            ))}
          </div>

          {error && <div className="mt-3 text-xs text-danger">{error}</div>}

          {result && (
            <div className="mt-3.5 whitespace-pre-wrap rounded-md border border-border-subtle bg-surface p-3 text-sm leading-relaxed text-text-tertiary">
              {result}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <span className="text-[11px] text-text-faint">AI-generated · review before sending</span>
          <div className="flex gap-2">
            {result && (
              <button
                onClick={() => onInsert(result)}
                className="h-[34px] rounded-md border border-border-subtle bg-surface px-3.5 text-sm font-medium text-text-secondary hover:bg-raised"
              >
                {context ? 'Replace content' : 'Insert'}
              </button>
            )}
            <button
              onClick={() => run()}
              disabled={loading || !prompt.trim()}
              className="h-[34px] flex items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Generating…' : result ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
