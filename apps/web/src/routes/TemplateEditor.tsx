import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { renderBodyHtml, renderBodyText, type ProseMirrorNode } from '@genius-campaign/shared';
import { PersonalizationToken } from '../lib/tiptap/personalization-token';
import { SpintaxBlock } from '../lib/tiptap/spintax-block';
import { R2Image } from '../lib/tiptap/r2-image';
import { CtaButton } from '../lib/tiptap/cta-button';
import { TemplateEditorToolbar } from '../components/TemplateEditorToolbar';
import { SpintaxShufflePreview } from '../components/SpintaxShufflePreview';
import { TemplateLibraryModal } from '../components/TemplateLibraryModal';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import { SendTestEmailModal } from '../components/SendTestEmailModal';
import { LinkClickPopover } from '../components/LinkClickPopover';
import { PromptDialog } from '../components/PromptDialog';
import { createTemplate, getTemplate, updateTemplate } from '../lib/templatesApi';
import { useAuthStore } from '../stores/useAuthStore';
import type { LibraryTemplate } from '../lib/emailTemplateLibrary';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [name, setName] = useState('Untitled template');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const noticeTimeout = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const [showLibrary, setShowLibrary] = useState(isNew);
  const [showPreview, setShowPreview] = useState(false);
  const [showSendTest, setShowSendTest] = useState(false);
  const [linkPopup, setLinkPopup] = useState<{ pos: number; href: string; x: number; y: number } | null>(null);
  const [linkEditOpen, setLinkEditOpen] = useState(false);
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');
  const currentUserEmail = useAuthStore((s) => s.user?.email ?? '');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      PersonalizationToken,
      SpintaxBlock,
      R2Image,
      CtaButton,
    ],
    content: EMPTY_DOC,
    editable: canWrite,
    editorProps: {
      // Clicking a link inside the template body should never navigate the
      // admin app away — show a small popover to open/edit it instead. The
      // CTA button node handles its own click (data-cta-button), so skip it here.
      handleClick(_view, pos, event) {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor && anchor.getAttribute('href') && !anchor.hasAttribute('data-cta-button')) {
          event.preventDefault();
          const rect = anchor.getBoundingClientRect();
          setLinkPopup({ pos, href: anchor.getAttribute('href') ?? '', x: rect.left, y: rect.bottom + 6 });
          return true;
        }
        setLinkPopup(null);
        return false;
      },
    },
  });

  useEffect(() => {
    if (!id || !editor) return;
    getTemplate(id).then((template) => {
      setName(template.name);
      setSubject(template.subject);
      editor.commands.setContent(template.bodyJson);
      setLoaded(true);
    });
  }, [id, editor]);

  function toast(text: string, tone: 'success' | 'error') {
    setNotice({ text, tone });
    if (noticeTimeout.current) window.clearTimeout(noticeTimeout.current);
    noticeTimeout.current = window.setTimeout(() => setNotice(null), 5000);
  }

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    try {
      const bodyJson = editor.getJSON();
      if (isNew) {
        const created = await createTemplate({ name, subject, bodyJson });
        navigate(`/templates/${created.id}`, { replace: true });
      } else {
        await updateTemplate(id!, { name, subject, bodyJson });
      }
      setSavedAt(new Date());
      toast('Template saved.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function applyLibraryTemplate(t: LibraryTemplate) {
    setName(t.name);
    setSubject(t.subject);
    editor?.commands.setContent(t.bodyJson);
    setShowLibrary(false);
  }

  function currentBody() {
    const bodyJson = (editor?.getJSON() ?? EMPTY_DOC) as ProseMirrorNode;
    return { bodyHtml: renderBodyHtml(bodyJson), bodyText: renderBodyText(bodyJson) };
  }

  if (!loaded) {
    return <div className="text-sm text-text-muted">Loading template…</div>;
  }

  return (
    <div className="grid grid-cols-[1fr_320px] items-start gap-4">
      {showLibrary && canWrite && (
        <TemplateLibraryModal onPick={applyLibraryTemplate} onBlank={() => setShowLibrary(false)} />
      )}
      {notice && (
        <div
          className={`fixed right-5 top-5 z-[80] rounded-md border px-3.5 py-2.5 text-xs shadow-lg ${
            notice.tone === 'success' ? 'border-success/25 bg-panel2 text-success' : 'border-danger/25 bg-panel2 text-danger'
          }`}
        >
          {notice.text}
        </div>
      )}
      <div className="flex flex-col rounded-md border border-border-default bg-panel">
        <div className="flex items-center justify-between gap-4 border-b border-border-default px-5 py-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-heading outline-none"
          />
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="h-8 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised"
            >
              Preview
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSendTest((s) => !s)}
                className="h-8 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Send test
              </button>
              {showSendTest && (
                <SendTestEmailModal
                  subject={subject}
                  bodyHtml={currentBody().bodyHtml}
                  bodyText={currentBody().bodyText}
                  defaultEmail={currentUserEmail}
                  onClose={() => setShowSendTest(false)}
                />
              )}
            </div>
            {canWrite && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-8 rounded-md bg-accent px-3.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <TemplateEditorToolbar editor={editor} />

        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-3">
          <span className="w-16 shrink-0 text-xs text-text-meta">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line, e.g. Hi {{contact.firstName}}"
            className="flex-1 bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-faint"
          />
        </div>

        <div className="max-w-2xl px-6 py-5">
          <EditorContent
            editor={editor}
            className="prose-sm min-h-[240px] text-sm leading-relaxed text-text-secondary [&_.ProseMirror]:min-h-[240px] [&_.ProseMirror]:outline-none [&_a]:text-accent-light [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-text-muted [&_blockquote]:italic [&_hr]:my-4 [&_hr]:border-border-strong [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-text-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-heading [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-heading [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-1.5"
          />
        </div>

        {savedAt && <div className="px-6 pb-4 text-xs text-text-faint">Saved {savedAt.toLocaleTimeString()}</div>}
      </div>

      <SpintaxShufflePreview editor={editor} subject={subject} templateId={id} templateName={name} />

      {showPreview && (
        <TemplatePreviewModal
          subject={subject}
          bodyHtml={currentBody().bodyHtml}
          bodyText={currentBody().bodyText}
          defaultTestEmail={currentUserEmail}
          onClose={() => setShowPreview(false)}
        />
      )}

      {linkPopup && (
        <LinkClickPopover
          href={linkPopup.href}
          x={linkPopup.x}
          y={linkPopup.y}
          onOpen={() => {
            window.open(linkPopup.href, '_blank', 'noopener,noreferrer');
            setLinkPopup(null);
          }}
          onEdit={() => {
            editor?.chain().setTextSelection(linkPopup.pos).extendMarkRange('link').run();
            setLinkEditOpen(true);
            setLinkPopup(null);
          }}
          onClose={() => setLinkPopup(null)}
        />
      )}

      {linkEditOpen && editor && (
        <PromptDialog
          title="Edit link"
          submitLabel="Update"
          fields={[{ key: 'url', label: 'URL', placeholder: 'https://', defaultValue: (editor.getAttributes('link').href as string) ?? '' }]}
          onClose={() => setLinkEditOpen(false)}
          onSubmit={({ url }) => {
            if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            setLinkEditOpen(false);
          }}
          onRemove={() => {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            setLinkEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
