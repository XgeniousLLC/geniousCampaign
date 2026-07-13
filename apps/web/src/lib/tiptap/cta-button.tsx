import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

export interface CtaButtonOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaButton: {
      insertCtaButton: (attrs: { text: string; href: string }) => ReturnType;
    };
  }
}

// Inline styles only (no external stylesheet) so the button still renders
// correctly once this node's HTML is pulled into an actual sent email —
// most mail clients strip <style> blocks and class names.
const BUTTON_STYLE =
  'display:inline-block;padding:10px 22px;background:#6366F1;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px';

function CtaButtonView({ node, updateAttributes }: NodeViewProps) {
  const text = (node.attrs.text as string) ?? 'Click here';
  const href = (node.attrs.href as string) ?? '#';

  function edit() {
    const newText = window.prompt('Button text', text);
    if (newText === null) return;
    const newHref = window.prompt('Button URL', href);
    if (newHref === null) return;
    updateAttributes({ text: newText, href: newHref });
  }

  return (
    <NodeViewWrapper as="div" contentEditable={false} className="my-1">
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          edit();
        }}
        title="Click to edit button text/URL"
        style={{ cursor: 'pointer' }}
        className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-accent-hover"
      >
        {text}
      </a>
    </NodeViewWrapper>
  );
}

export const CtaButton = Node.create<CtaButtonOptions>({
  name: 'ctaButton',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      text: { default: 'Click here' },
      href: { default: '#' },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-cta-button]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-cta-button': 'true',
        href: node.attrs.href,
        style: BUTTON_STYLE,
      }),
      node.attrs.text,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaButtonView);
  },

  addCommands() {
    return {
      insertCtaButton:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
