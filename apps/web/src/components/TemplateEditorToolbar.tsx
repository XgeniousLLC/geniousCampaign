import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { renderBodyText, type ProseMirrorNode } from '@genius-campaign/shared';
import { useImageUpload } from '../lib/useImageUpload';
import { AiAssistModal } from './AiAssistModal';
import { PromptDialog } from './PromptDialog';
import { aiTextToDoc } from '../lib/aiTextToDoc';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  LinkIcon,
  ImageIcon,
  BulletListIcon,
  OrderedListIcon,
  BlockquoteIcon,
  HorizontalRuleIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  UndoIcon,
  RedoIcon,
  CtaButtonIcon,
} from './icons';

const PERSONALIZATION_TOKENS = [
  { field: 'contact.firstName', label: 'First name' },
  { field: 'contact.lastName', label: 'Last name' },
  { field: 'contact.email', label: 'Email' },
];

const HEADING_OPTIONS = [
  { value: 'p', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
];

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? 'bg-raised2 text-text-primary' : 'text-text-quaternary hover:bg-raised hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-4 w-px shrink-0 bg-border-strong" />;
}

export function TemplateEditorToolbar({ editor }: { editor: Editor | null }) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const { inputRef, uploading, error, openFilePicker, handleFileChange } = useImageUpload(editor);

  if (!editor) return null;

  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : 'p';

  return (
    <div className="relative flex flex-wrap items-center gap-1 border-b border-border-default bg-surface px-3 py-2">
      <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <RedoIcon />
      </ToolbarButton>

      <ToolbarDivider />

      <select
        title="Paragraph style"
        value={currentHeading}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'p') editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
        }}
        className="h-8 shrink-0 rounded border-none bg-transparent px-1.5 text-xs font-medium text-text-quaternary outline-none hover:bg-raised hover:text-text-primary"
      >
        {HEADING_OPTIONS.map((h) => (
          <option key={h.value} value={h.value} className="bg-panel2 text-text-primary">
            {h.label}
          </option>
        ))}
      </select>

      <ToolbarDivider />

      <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon />
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <StrikethroughIcon />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeftIcon />
      </ToolbarButton>
      <ToolbarButton
        title="Align center"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenterIcon />
      </ToolbarButton>
      <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRightIcon />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton title="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <BulletListIcon />
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <OrderedListIcon />
      </ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <BlockquoteIcon />
      </ToolbarButton>
      <ToolbarButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <HorizontalRuleIcon />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton title="Link" active={editor.isActive('link')} onClick={() => setLinkDialogOpen(true)}>
        <LinkIcon />
      </ToolbarButton>
      <ToolbarButton title="Insert image" onClick={openFilePicker}>
        {uploading ? '…' : <ImageIcon />}
      </ToolbarButton>
      <ToolbarButton title="Insert button" onClick={() => setButtonDialogOpen(true)}>
        <CtaButtonIcon />
      </ToolbarButton>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
      {error && (
        <span className="ml-1 max-w-xs truncate text-[11px] text-danger" title={error}>
          {error}
        </span>
      )}

      <ToolbarDivider />

      <button
        type="button"
        onClick={() => editor.chain().focus().insertSpintaxBlock({ options: ['option A', 'option B'] }).run()}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded border border-accent-light/25 bg-accent-light/10 px-2.5 text-xs font-semibold text-accent-lighter hover:bg-accent-light/15"
      >
        Spintax
      </button>
      <button
        type="button"
        onClick={() => setTokenOpen((o) => !o)}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded border border-accent/25 bg-accent/10 px-2.5 text-xs font-semibold text-accent-light hover:bg-accent/15"
      >
        Insert token ▾
      </button>
      <button
        type="button"
        onClick={() => setAiOpen(true)}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded border border-purple-400/25 bg-purple-400/10 px-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-400/15"
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
          context={renderBodyText(editor.getJSON() as ProseMirrorNode)}
          onInsert={(text) => {
            // Replaces the whole doc rather than inserting at cursor — this
            // modal is opened as "rewrite my template," so the result should
            // become the new content, with tokens/buttons parsed back into
            // real nodes rather than left as literal AI-output text.
            editor.commands.setContent(aiTextToDoc(text));
            setAiOpen(false);
          }}
        />
      )}
      {linkDialogOpen && (
        <PromptDialog
          title="Link"
          submitLabel={editor.isActive('link') ? 'Update' : 'Insert'}
          fields={[{ key: 'url', label: 'URL', placeholder: 'https://', defaultValue: (editor.getAttributes('link').href as string) ?? '' }]}
          onClose={() => setLinkDialogOpen(false)}
          onSubmit={({ url }) => {
            if (url) editor.chain().focus().setLink({ href: url }).run();
            setLinkDialogOpen(false);
          }}
          onRemove={
            editor.isActive('link')
              ? () => {
                  editor.chain().focus().unsetLink().run();
                  setLinkDialogOpen(false);
                }
              : undefined
          }
        />
      )}
      {buttonDialogOpen && (
        <PromptDialog
          title="Insert button"
          submitLabel="Insert"
          fields={[
            { key: 'text', label: 'Button text', defaultValue: 'Click here' },
            { key: 'href', label: 'Button URL', placeholder: 'https://' },
          ]}
          onClose={() => setButtonDialogOpen(false)}
          onSubmit={({ text, href }) => {
            editor.chain().focus().insertCtaButton({ text, href }).run();
            setButtonDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
