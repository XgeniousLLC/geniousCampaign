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
import { TemplateEditorToolbar, PERSONALIZATION_TOKENS } from '../components/TemplateEditorToolbar';
import { SpintaxShufflePreview } from '../components/SpintaxShufflePreview';
import { TemplateLibraryModal } from '../components/TemplateLibraryModal';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import { SendTestEmailModal } from '../components/SendTestEmailModal';
import { LinkClickPopover } from '../components/LinkClickPopover';
import { PromptDialog } from '../components/PromptDialog';
import { CheckCircleIcon, XCircleIcon } from '../components/icons';
import { createTemplate, getTemplate, updateTemplate, deleteTemplate } from '../lib/templatesApi';
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
  const [parentTemplateId, setParentTemplateId] = useState<string | null>(null);
  const [linkPopup, setLinkPopup] = useState<{ pos: number; href: string; x: number; y: number } | null>(null);
  const [linkEditOpen, setLinkEditOpen] = useState(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [subjectTokenOpen, setSubjectTokenOpen] = useState(false);
  const [subjectCustomKey, setSubjectCustomKey] = useState('');
  const subjectCustomKeyValid = /^[a-zA-Z0-9_]+$/.test(subjectCustomKey.trim());
  const [subjectFallback, setSubjectFallback] = useState('');
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
      setParentTemplateId(template.parentTemplateId ?? null);
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

  async function handleDelete() {
    if (!id) return;
    if (!confirm('Delete this template? This also removes all its variants.')) return;
    try {
      await deleteTemplate(id);
      navigate('/templates');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    }
  }

  // Subject is a plain &lt;input&gt;, not a TipTap doc — insert at the tracked
  // cursor position and restore selection there, mirroring the body
  // toolbar's insertPersonalizationToken/insertSpintaxBlock commands.
  function insertIntoSubject(text: string) {
    const el = subjectInputRef.current;
    const start = el?.selectionStart ?? subject.length;
    const end = el?.selectionEnd ?? subject.length;
    const next = subject.slice(0, start) + text + subject.slice(end);
    setSubject(next);
    const pos = start + text.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
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
          className={`fixed left-1/2 top-16 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-2xl ${
            notice.tone === 'success' ? 'border-success/30 bg-panel2 text-success' : 'border-danger/30 bg-panel2 text-danger'
          }`}
        >
          {notice.tone === 'success' ? <CheckCircleIcon className="shrink-0" /> : <XCircleIcon className="shrink-0" />}
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
            {!isNew && canWrite && (
              <button
                onClick={handleDelete}
                title="Delete template"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-field text-text-faint hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            )}
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
            ref={subjectInputRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line, e.g. Hi {{contact.firstName}}"
            className="flex-1 bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-faint"
          />
          <button
            type="button"
            onClick={() => insertIntoSubject('{option A|option B}')}
            className="flex h-7 shrink-0 items-center gap-1.5 rounded border border-accent-light/25 bg-accent-light/10 px-2 text-[11px] font-semibold text-accent-lighter hover:bg-accent-light/15"
          >
            Spintax
          </button>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSubjectTokenOpen((o) => !o)}
              className="flex h-7 items-center gap-1.5 rounded border border-accent/25 bg-accent/10 px-2 text-[11px] font-semibold text-accent-light hover:bg-accent/15"
            >
              Insert token ▾
            </button>
            {subjectTokenOpen && (
              <div className="absolute right-0 top-8 z-20 w-60 rounded-md border border-border-modal bg-panel2 p-1 shadow-lg">
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-text-meta">Personalization tokens</div>
                {PERSONALIZATION_TOKENS.map((tk) => (
                  <button
                    key={tk.field}
                    type="button"
                    onClick={() => {
                      const fallback = subjectFallback.trim();
                      insertIntoSubject(`{{${tk.field}${fallback ? `|${fallback}` : ''}}}`);
                      setSubjectTokenOpen(false);
                    }}
                    className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left font-mono text-xs text-text-tertiary hover:bg-raised"
                  >
                    <span className="text-accent-light">{'{{'}</span>
                    {tk.label}
                    <span className="text-accent-light">{'}}'}</span>
                  </button>
                ))}
                <div className="mt-1 border-t border-border-subtle p-2 pt-1.5">
                  <div className="mb-1.5 text-[10px] uppercase tracking-wide text-text-meta">Fallback if empty</div>
                  <input
                    value={subjectFallback}
                    onChange={(e) => setSubjectFallback(e.target.value)}
                    placeholder="e.g. there (optional)"
                    className="h-7 w-full rounded border border-border-subtle bg-surface px-1.5 text-xs text-text-primary placeholder:text-text-faint"
                  />
                </div>
                <div className="mt-1 border-t border-border-subtle p-2 pt-2">
                  <div className="mb-1.5 text-[10px] uppercase tracking-wide text-text-meta">Custom field</div>
                  <div className="flex gap-1">
                    <input
                      value={subjectCustomKey}
                      onChange={(e) => setSubjectCustomKey(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' || !subjectCustomKeyValid) return;
                        const key = subjectCustomKey.trim();
                        const fallback = subjectFallback.trim();
                        insertIntoSubject(`{{contact.custom.${key}${fallback ? `|${fallback}` : ''}}}`);
                        setSubjectCustomKey('');
                        setSubjectTokenOpen(false);
                      }}
                      placeholder="field key"
                      className="h-7 min-w-0 flex-1 rounded border border-border-subtle bg-surface px-1.5 font-mono text-xs text-text-primary placeholder:text-text-faint"
                    />
                    <button
                      type="button"
                      disabled={!subjectCustomKeyValid}
                      onClick={() => {
                        const key = subjectCustomKey.trim();
                        const fallback = subjectFallback.trim();
                        insertIntoSubject(`{{contact.custom.${key}${fallback ? `|${fallback}` : ''}}}`);
                        setSubjectCustomKey('');
                        setSubjectTokenOpen(false);
                      }}
                      className="h-7 shrink-0 rounded border border-accent/25 bg-accent/10 px-2 text-xs font-semibold text-accent-light hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Insert
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-2xl px-6 py-5">
          <EditorContent
            editor={editor}
            className="prose-sm min-h-[240px] text-sm leading-relaxed text-text-secondary [&_.ProseMirror]:min-h-[240px] [&_.ProseMirror]:outline-none [&_a]:text-accent-light [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-text-muted [&_blockquote]:italic [&_hr]:my-4 [&_hr]:border-border-strong [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-text-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-heading [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-heading [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-1.5"
          />
        </div>

        {savedAt && <div className="px-6 pb-4 text-xs text-text-faint">Saved {savedAt.toLocaleTimeString()}</div>}
      </div>

      <SpintaxShufflePreview editor={editor} subject={subject} templateId={id} templateName={name} parentTemplateId={parentTemplateId} />

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
