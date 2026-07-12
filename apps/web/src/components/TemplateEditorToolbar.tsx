import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { useImageUpload } from '../lib/useImageUpload';
import { AiAssistModal } from './AiAssistModal';

const PERSONALIZATION_TOKENS = [
  { field: 'contact.firstName', label: 'First name' },
  { field: 'contact.lastName', label: 'Last name' },
  { field: 'contact.email', label: 'Email' },
];

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded text-sm font-semibold ${
        active ? 'bg-raised2 text-text-primary' : 'text-text-quaternary hover:bg-raised hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

export function TemplateEditorToolbar({ editor }: { editor: Editor | null }) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { inputRef, uploading, error, openFilePicker, handleFileChange } = useImageUpload(editor);

  if (!editor) return null;

  return (
    <div className="relative flex items-center gap-1 border-b border-border-default bg-surface px-3 py-2">
      <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        title="Link"
        active={editor.isActive('link')}
        onClick={() => {
          const url = window.prompt('URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else editor.chain().focus().unsetLink().run();
        }}
      >
        🔗
      </ToolbarButton>
      <ToolbarButton title="Insert image" onClick={openFilePicker}>
        {uploading ? '…' : '🖼'}
      </ToolbarButton>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
      {error && (
        <span className="ml-1 max-w-xs truncate text-[11px] text-danger" title={error}>
          {error}
        </span>
      )}
      <div className="mx-1 h-4 w-px bg-border-strong" />
      <button
        type="button"
        onClick={() => editor.chain().focus().insertSpintaxBlock({ options: ['option A', 'option B'] }).run()}
        className="flex h-8 items-center gap-1.5 rounded border border-accent-light/25 bg-accent-light/10 px-2.5 text-xs font-semibold text-accent-lighter hover:bg-accent-light/15"
      >
        Spintax
      </button>
      <button
        type="button"
        onClick={() => setTokenOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded border border-accent/25 bg-accent/10 px-2.5 text-xs font-semibold text-accent-light hover:bg-accent/15"
      >
        Insert token ▾
      </button>
      <button
        type="button"
        onClick={() => setAiOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded border border-purple-400/25 bg-purple-400/10 px-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-400/15"
      >
        ✦ AI Assist
      </button>
      {tokenOpen && (
        <div className="absolute top-10 left-32 z-20 w-56 rounded-md border border-border-modal bg-panel2 p-1 shadow-lg">
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-text-meta">Personalization tokens</div>
          {PERSONALIZATION_TOKENS.map((tk) => (
            <button
              key={tk.field}
              type="button"
              onClick={() => {
                editor.chain().focus().insertPersonalizationToken(tk).run();
                setTokenOpen(false);
              }}
              className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left font-mono text-xs text-text-tertiary hover:bg-raised"
            >
              <span className="text-accent-light">{'{{'}</span>
              {tk.label}
              <span className="text-accent-light">{'}}'}</span>
            </button>
          ))}
        </div>
      )}
      {aiOpen && (
        <AiAssistModal
          onClose={() => setAiOpen(false)}
          onInsert={(text) => {
            editor.chain().focus().insertContent(text).run();
            setAiOpen(false);
          }}
        />
      )}
    </div>
  );
}
