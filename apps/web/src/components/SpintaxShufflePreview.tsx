import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { renderBodyText, resolveSpintax, type ProseMirrorNode } from '@genius-campaign/shared';

const VARIANT_COUNT = 3;

export function SpintaxShufflePreview({ editor }: { editor: Editor | null }) {
  const [variants, setVariants] = useState<string[]>([]);

  function shuffle() {
    if (!editor) return;
    const bodyJson = editor.getJSON() as ProseMirrorNode;
    const rawText = renderBodyText(bodyJson);
    setVariants(Array.from({ length: VARIANT_COUNT }, () => resolveSpintax(rawText)));
  }

  return (
    <div className="rounded-md border border-border-default bg-surface">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">Shuffle preview</div>
          <div className="text-[11px] text-text-faint">Randomly resolved variants</div>
        </div>
        <button
          onClick={shuffle}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-field px-2.5 text-xs font-medium text-text-secondary hover:bg-raised"
        >
          Shuffle
        </button>
      </div>
      <div className="flex flex-col gap-3 p-3">
        {variants.length === 0 && (
          <div className="px-1 py-2 text-xs text-text-faint">Click Shuffle to see resolved variants.</div>
        )}
        {variants.map((text, i) => (
          <div key={i} className="overflow-hidden rounded-md border border-border-subtle bg-panel">
            <div className="flex items-center gap-1.5 border-b border-border-subtle bg-panel2 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-light" />
              <span className="text-[11px] font-semibold text-text-muted">Variant {i + 1}</span>
            </div>
            <div className="whitespace-pre-wrap px-3 py-2.5 text-xs leading-relaxed text-text-tertiary">{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
