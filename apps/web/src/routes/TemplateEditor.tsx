import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { PersonalizationToken } from '../lib/tiptap/personalization-token';
import { SpintaxBlock } from '../lib/tiptap/spintax-block';
import { R2Image } from '../lib/tiptap/r2-image';
import { TemplateEditorToolbar } from '../components/TemplateEditorToolbar';
import { SpintaxShufflePreview } from '../components/SpintaxShufflePreview';
import { createTemplate, getTemplate, updateTemplate } from '../lib/templatesApi';
import { useAuthStore } from '../stores/useAuthStore';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [name, setName] = useState('Untitled template');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(isNew);
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), PersonalizationToken, SpintaxBlock, R2Image],
    content: EMPTY_DOC,
    editable: canWrite,
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
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <div className="text-sm text-text-muted">Loading template…</div>;
  }

  return (
    <div className="grid grid-cols-[1fr_320px] items-start gap-4">
      <div className="flex flex-col rounded-md border border-border-default bg-panel">
        <div className="flex items-center justify-between gap-4 border-b border-border-default px-5 py-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-heading outline-none"
          />
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
            className="prose-sm min-h-[240px] text-sm leading-relaxed text-text-secondary [&_.ProseMirror]:min-h-[240px] [&_.ProseMirror]:outline-none [&_a]:text-accent-light [&_a]:underline"
          />
        </div>

        {savedAt && <div className="px-6 pb-4 text-xs text-text-faint">Saved {savedAt.toLocaleTimeString()}</div>}
      </div>

      <SpintaxShufflePreview editor={editor} subject={subject} templateId={id} templateName={name} />
    </div>
  );
}
