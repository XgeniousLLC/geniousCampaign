import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { renderBodyHtml, renderBodyText, isEmailStudioBody, type EmailStudioBody } from '@genius-campaign/shared';
import { TemplateLinesFields } from '../components/TemplateLinesFields';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import { SendTestEmailModal } from '../components/SendTestEmailModal';
import { CheckCircleIcon, XCircleIcon } from '../components/icons';
import { uploadImageFile } from '../lib/imageUploadPipeline';
import { createTemplate, updateTemplate, deleteTemplate, type Template } from '../lib/templatesApi';
import { useAuthStore } from '../stores/useAuthStore';

const STUDIO_URL = '/email-studio/index.html';

// Messages exchanged with the editor iframe (public/email-studio/index.html).
// It runs same-origin, so every message is origin- and source-checked.
type FromStudio =
  | { source: 'email-studio'; type: 'ready' }
  | { source: 'email-studio'; type: 'change'; doc: Record<string, unknown>; html: string }
  | { source: 'email-studio'; type: 'upload'; id: string; file: File };

function isFromStudio(data: unknown): data is FromStudio {
  return typeof data === 'object' && data !== null && (data as { source?: unknown }).source === 'email-studio';
}

export function StudioTemplateEditor({ template }: { template?: Template }) {
  const navigate = useNavigate();
  const id = template?.id;
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');
  const currentUserEmail = useAuthStore((s) => s.user?.email ?? '');

  const [name, setName] = useState(template?.name ?? 'Untitled template');
  const [subjectLines, setSubjectLines] = useState<string[]>(template?.subjectLines.length ? template.subjectLines : ['']);
  const [previewTextLines, setPreviewTextLines] = useState<string[]>(template?.previewTextLines ?? []);
  const initialBody = template && isEmailStudioBody(template.bodyJson as { type: string }) ? (template.bodyJson as unknown as EmailStudioBody) : null;
  const [body, setBody] = useState<EmailStudioBody | null>(initialBody);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const noticeTimeout = useRef<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSendTest, setShowSendTest] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const bodyHtml = useMemo(() => (body ? renderBodyHtml(body) : ''), [body]);
  const bodyText = useMemo(() => (body ? renderBodyText(body) : ''), [body]);
  // Gallery samples ship inline SVG placeholders; mail clients drop data: images.
  const placeholderImages = (bodyHtml.match(/<img[^>]+src="data:/g) ?? []).length;

  function toast(text: string, tone: 'success' | 'error') {
    setNotice({ text, tone });
    if (noticeTimeout.current) window.clearTimeout(noticeTimeout.current);
    noticeTimeout.current = window.setTimeout(() => setNotice(null), 5000);
  }

  useEffect(() => {
    if (!canWrite) return;
    function post(message: Record<string, unknown>) {
      frameRef.current?.contentWindow?.postMessage({ source: 'email-studio', ...message }, window.location.origin);
    }
    function onMessage(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow || e.origin !== window.location.origin || !isFromStudio(e.data)) return;
      const m = e.data;
      if (m.type === 'ready') {
        post({ type: 'init', doc: initialBody?.doc ?? null });
      } else if (m.type === 'change') {
        setBody({ type: 'email-studio', doc: m.doc, html: m.html });
      } else if (m.type === 'upload') {
        uploadImageFile(m.file).then(
          (url) => post({ type: 'uploaded', id: m.id, url }),
          (err: unknown) => post({ type: 'uploaded', id: m.id, error: err instanceof Error ? err.message : 'Image upload failed.' }),
        );
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // initialBody is fixed for the lifetime of this mount (parent remounts per template).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite]);

  async function handleSave() {
    if (!body) return;
    setSaving(true);
    try {
      const cleanSubjectLines = subjectLines.map((s) => s.trim()).filter(Boolean);
      const input = {
        name,
        subjectLines: cleanSubjectLines.length > 0 ? cleanSubjectLines : [''],
        previewTextLines: previewTextLines.map((s) => s.trim()).filter(Boolean),
        bodyJson: { ...body },
      };
      if (id) {
        await updateTemplate(id, input);
      } else {
        const created = await createTemplate(input);
        navigate(`/templates/${created.id}`, { replace: true });
      }
      setSavedAt(new Date());
      toast('Template saved.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm('Delete this template?')) return;
    try {
      await deleteTemplate(id);
      navigate('/templates');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    }
  }

  const btn = 'h-8 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised disabled:opacity-50';

  return (
    <div className="flex flex-col gap-4">
      <RouterLink to="/templates" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary">
        ← Templates
      </RouterLink>
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
            {id && canWrite && (
              <button onClick={handleDelete} className={btn}>
                Delete
              </button>
            )}
            <button onClick={() => setShowPreview(true)} disabled={!body} className={btn}>
              Preview
            </button>
            <div className="relative">
              <button onClick={() => setShowSendTest((s) => !s)} disabled={!body} className={btn}>
                Send test
              </button>
              {showSendTest && (
                <SendTestEmailModal
                  subject={subjectLines[0] ?? ''}
                  bodyHtml={bodyHtml}
                  bodyText={bodyText}
                  defaultEmail={currentUserEmail}
                  onClose={() => setShowSendTest(false)}
                />
              )}
            </div>
            {canWrite && (
              <button
                onClick={handleSave}
                disabled={saving || !body}
                title={body ? undefined : 'Pick a design from the gallery first'}
                className="h-8 rounded-md bg-accent px-3.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <TemplateLinesFields
          subjectLines={subjectLines}
          setSubjectLines={setSubjectLines}
          previewTextLines={previewTextLines}
          setPreviewTextLines={setPreviewTextLines}
          canWrite={canWrite}
        />

        {placeholderImages > 0 && (
          <div className="border-b border-border-subtle bg-warning/10 px-5 py-2 text-xs text-warning">
            {placeholderImages} sample image{placeholderImages === 1 ? '' : 's'} still in this design — select each image and upload your own before sending, as inboxes block embedded placeholders.
          </div>
        )}

        <div className="h-[78vh] min-h-[600px] bg-white">
          {canWrite ? (
            <iframe ref={frameRef} src={STUDIO_URL} title="Email designer" className="h-full w-full border-0" />
          ) : (
            <iframe srcDoc={bodyHtml} sandbox="" title="Template preview" className="h-full w-full border-0" />
          )}
        </div>

        {savedAt && <div className="px-6 py-3 text-xs text-text-faint">Saved {savedAt.toLocaleTimeString()}</div>}
      </div>

      {showPreview && (
        <TemplatePreviewModal
          subject={subjectLines[0] ?? ''}
          bodyHtml={bodyHtml}
          bodyText={bodyText}
          defaultTestEmail={currentUserEmail}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
