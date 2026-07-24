import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';

export interface SpintaxBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spintaxBlock: {
      insertSpintaxBlock: (attrs: { options: string[] }) => ReturnType;
    };
  }
}

function SpintaxBlockView({ node, updateAttributes }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLElement>(null);
  const options: string[] = (node.attrs.options as string[]) ?? [];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function setOption(i: number, value: string) {
    const next = [...options];
    next[i] = value;
    updateAttributes({ options: next });
  }

  function addOption() {
    updateAttributes({ options: [...options, ''] });
  }

  function removeOption(i: number) {
    updateAttributes({ options: options.filter((_, idx) => idx !== i) });
  }

  return (
    <NodeViewWrapper as="span" ref={wrapperRef} className="relative inline-block" contentEditable={false}>
      <span
        onClick={() => setOpen((o) => !o)}
        className="mx-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-dashed border-accent-light/40 bg-accent-light/10 px-2 py-0.5 text-xs font-medium text-accent-lighter"
      >
        {options[0] || 'option'}
        <span className="rounded-sm bg-accent-light/25 px-1 font-mono text-[10px] text-accent-tint">{options.length}</span>
      </span>
      {open && (
        <div className="absolute top-6 left-0 z-20 w-64 rounded-md border border-border-modal bg-panel2 p-2 shadow-lg">
          <div className="mb-1 px-1 text-[10px] uppercase tracking-wide text-text-meta">Spintax options</div>
          {options.map((opt, i) => (
            <div key={i} className="mb-1 flex items-center gap-1">
              <input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                className="min-w-0 flex-1 rounded border border-border-default bg-field px-2 py-1 text-xs text-text-primary outline-none"
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={options.length <= 1}
                className="rounded px-1.5 text-xs text-text-faint hover:text-danger disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="mt-1 w-full rounded border border-border-default px-2 py-1 text-xs text-text-muted hover:bg-raised hover:text-text-primary"
          >
            + Add option
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const SpintaxBlock = Node.create<SpintaxBlockOptions>({
  name: 'spintaxBlock',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      options: { default: ['option A', 'option B'] },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-spintax-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const options = (node.attrs.options as string[]) ?? [];
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-spintax-block': 'true' }),
      `{${options.join('|')}}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpintaxBlockView);
  },

  addCommands() {
    return {
      insertSpintaxBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
