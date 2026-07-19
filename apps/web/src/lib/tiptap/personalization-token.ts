import { Node, mergeAttributes } from '@tiptap/core';

export interface PersonalizationTokenOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    personalizationToken: {
      insertPersonalizationToken: (attrs: { field: string; label: string; fallback?: string }) => ReturnType;
    };
  }
}

export const PersonalizationToken = Node.create<PersonalizationTokenOptions>({
  name: 'personalizationToken',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      field: { default: null },
      label: { default: null },
      // Shown when the contact has no value for this field/custom key —
      // e.g. {{contact.firstName|there}} resolves to "there" instead of ''.
      fallback: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-personalization-token]',
        getAttrs: (el) => ({
          field: (el as HTMLElement).getAttribute('data-personalization-token'),
          fallback: (el as HTMLElement).getAttribute('data-fallback'),
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const fallback = typeof node.attrs.fallback === 'string' && node.attrs.fallback ? node.attrs.fallback : null;
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-personalization-token': node.attrs.field,
        ...(fallback ? { 'data-fallback': fallback } : {}),
        class:
          'inline-flex items-center gap-1 rounded-sm border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-xs text-accent-light',
      }),
      `{{${node.attrs.field}${fallback ? `|${fallback}` : ''}}}`,
    ];
  },

  addCommands() {
    return {
      insertPersonalizationToken:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
