import { useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { PromptDialog } from '../../components/PromptDialog';

export interface CtaButtonOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaButton: {
      insertCtaButton: (attrs: { text: string; href: string; color?: string; textColor?: string }) => ReturnType;
    };
  }
}

const DEFAULT_COLOR = '#6366F1';
const DEFAULT_TEXT_COLOR = '#ffffff';

function safeHex(color: string, fallback: string) {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : fallback;
}

// Inline styles only (no external stylesheet) so the button still renders
// correctly once this node's HTML is pulled into an actual sent email —
// most mail clients strip <style> blocks and class names.
function buttonStyle(color: string, textColor: string) {
  const safeColor = safeHex(color, DEFAULT_COLOR);
  const safeTextColor = safeHex(textColor, DEFAULT_TEXT_COLOR);
  return `display:inline-block;padding:10px 22px;background:${safeColor};color:${safeTextColor};border-radius:6px;text-decoration:none;font-weight:600;font-size:14px`;
}

function CtaButtonView({ node, updateAttributes }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const text = (node.attrs.text as string) ?? 'Click here';
  const href = (node.attrs.href as string) ?? '#';
  const color = (node.attrs.color as string) ?? DEFAULT_COLOR;
  const textColor = (node.attrs.textColor as string) ?? DEFAULT_TEXT_COLOR;

  return (
    <NodeViewWrapper as="div" contentEditable={false} className="my-1">
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          setEditing(true);
        }}
        title="Click to edit button text/URL/color"
        style={{ cursor: 'pointer', backgroundColor: color, color: textColor }}
        className="inline-block rounded-md px-5 py-2.5 text-sm font-semibold no-underline"
      >
        {text}
      </a>
      {editing && (
        <PromptDialog
          title="Edit button"
          submitLabel="Save"
          fields={[
            { key: 'text', label: 'Button text', defaultValue: text },
            { key: 'href', label: 'Button URL', defaultValue: href },
            { key: 'color', label: 'Button color', type: 'color', defaultValue: color },
            { key: 'textColor', label: 'Text color', type: 'color', defaultValue: textColor },
          ]}
          onClose={() => setEditing(false)}
          onSubmit={(values) => {
            updateAttributes({ text: values.text, href: values.href, color: values.color, textColor: values.textColor });
            setEditing(false);
          }}
        />
      )}
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
      color: { default: DEFAULT_COLOR },
      textColor: { default: DEFAULT_TEXT_COLOR },
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
        style: buttonStyle((node.attrs.color as string) ?? DEFAULT_COLOR, (node.attrs.textColor as string) ?? DEFAULT_TEXT_COLOR),
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
