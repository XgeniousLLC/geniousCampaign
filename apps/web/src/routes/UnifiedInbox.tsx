import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import type { EditorView } from '@tiptap/pm/view';
import { R2Image } from '../lib/tiptap/r2-image';
import { uploadImageFile } from '../lib/imageUploadPipeline';
import { useImageUpload } from '../lib/useImageUpload';
import { ChevronDownIcon, ChevronUpIcon } from '../components/icons';
import {
  listThreads,
  getThread,
  patchThread,
  setThreadStatus,
  replyToThread,
  scheduleReply,
  listScheduled,
  cancelScheduled,
  STATUS_LABELS,
  type InboxThread,
  type InboxMessage,
  type ThreadStatus,
  type ScheduledReply,
} from '../lib/inboxApi';

const STATUSES = Object.keys(STATUS_LABELS) as ThreadStatus[];

const STATUS_PILL: Record<ThreadStatus, string> = {
  uncategorized: 'border-border-default bg-raised text-text-muted',
  interested: 'border-success/30 bg-success/10 text-success',
  not_interested: 'border-danger/30 bg-danger/10 text-danger',
  meeting_booked: 'border-info/30 bg-info/10 text-info',
  out_of_office: 'border-warning/30 bg-warning/10 text-warning',
  closed: 'border-border-strong bg-surface text-text-secondary',
};

const AUTO_FETCH_MS = 5 * 60_000;

function initials(email: string | null | undefined): string {
  if (!email) return '?';
  const name = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// A body line that marks the start of quoted reply/forwarded content — the
// same things Gmail tucks behind its "..." toggle.
const QUOTE_START = [
  /^\s*>/,
  /^\s*On .+wrote:\s*$/i,
  /^\s*-{2,}\s*Original Message\s*-{2,}/i,
  /^\s*-{2,}\s*Forwarded message\s*-{2,}/i,
  /^\s*_{10,}\s*$/,
];

/** Splits a message body into the freshly-written part and the quoted or
 * forwarded tail, so the tail can be hidden until the reader asks for it. */
function splitQuotedBody(raw: string): { visible: string; quoted: string } {
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!QUOTE_START.some((re) => re.test(lines[i]))) continue;
    const visible = lines.slice(0, i).join('\n').trim();
    const quoted = lines.slice(i).join('\n').trim();
    // A body that is *only* quoted content (a bare forward, an OOO
    // autoresponder) stays visible rather than collapsing to nothing.
    if (!visible) break;
    // Trailing bare markers like ">" aren't worth their own toggle.
    if (!/[^\s>]/.test(quoted)) return { visible, quoted: '' };
    return { visible, quoted };
  }
  return { visible: raw.trim(), quoted: '' };
}

function MessageCard({
  message: m,
  defaultCollapsed = false,
}: {
  message: InboxMessage;
  /** Older messages start collapsed so a long thread reads as a list; only
   * the two most recent open by default (see the caller). */
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [showQuoted, setShowQuoted] = useState(false);
  const { visible, quoted } = splitQuotedBody(m.bodyText ?? m.snippet ?? '');

  return (
    <div className="mb-2.5 overflow-hidden rounded-lg border border-border-subtle bg-panel">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? 'Expand message' : 'Collapse message'}
        className="flex w-full min-w-0 items-center gap-2 px-3.5 py-2.5 text-left hover:bg-raised"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-info-alt to-accent text-[9px] font-semibold text-white">
          {m.dir === 'in' ? initials(m.fromEmail) : 'Y'}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-secondary">
          {m.dir === 'in' ? m.fromEmail : `You → ${m.toEmail}`}
        </span>
        <span className="shrink-0 text-[11px] text-text-faint">
          {m.sentAt ? new Date(m.sentAt).toLocaleString() : ''}
        </span>
        <span className="shrink-0 text-text-faint">
          {collapsed ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
      {!collapsed && (
        <div className="px-3.5 pb-3.5">
          <div className="pl-8">
            <div className="whitespace-pre-wrap break-words text-[13px] text-text-primary">
              {visible}
            </div>
            {quoted && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQuoted((v) => !v)}
                  title={showQuoted ? 'Hide quoted text' : 'Show quoted text'}
                  className={`mt-1.5 inline-flex h-5 items-center rounded border px-1.5 text-[13px] leading-none tracking-[0.2em] ${
                    showQuoted
                      ? 'border-accent/40 bg-accent/10 text-accent-light'
                      : 'border-border-default text-text-faint hover:bg-raised hover:text-text-muted'
                  }`}
                >
                  •••
                </button>
                {showQuoted && (
                  <div className="mt-1.5 whitespace-pre-wrap break-words border-l-2 border-border-default pl-2.5 text-[12px] text-text-muted">
                    {quoted}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-default bg-raised text-text-faint">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      </span>
      <div className="mt-3 text-[13px] font-medium text-text-secondary">{title}</div>
      <div className="mt-1 max-w-full break-words text-xs text-text-faint">{hint}</div>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const label = source === 'manual' ? 'Manual' : source === 'ai' ? 'AI' : 'Auto';
  const title =
    source === 'manual' ? 'Set by a human' : source === 'ai' ? 'Guessed by AI' : 'Guessed by rules';
  const cls =
    source === 'manual'
      ? 'border-border-default bg-raised text-text-secondary'
      : source === 'ai'
        ? 'border-brand-ai/30 bg-brand-ai/10 text-brand-ai'
        : 'border-border-subtle text-text-faint';
  return (
    <span title={title} className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[13px] font-semibold ${
        active ? 'bg-accent/15 text-accent-light' : 'text-text-muted hover:bg-raised hover:text-text-secondary'
      }`}
    >
      {children}
    </button>
  );
}

export function UnifiedInbox() {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [sendAt, setSendAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledReply[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [editorEmpty, setEditorEmpty] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  // Latest search text for the auto-fetch timer (avoids stale closures).
  const qRef = useRef(q);
  qRef.current = q;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  // The thread whose messages are currently being fetched — a response for
  // an older thread must never overwrite a newer one that resolved first.
  const requestedThreadRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), R2Image],
    content: '',
    onUpdate: ({ editor }) => setEditorEmpty(editor.isEmpty),
    editorProps: {
      // Pasted/dropped images go through the same R2 upload pipeline as the
      // toolbar button — never embedded as base64 data URIs (invariant 6).
      handlePaste(view, event) {
        if (!view.editable) return false;
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        void uploadEditorImages(view, files);
        return true;
      },
      handleDrop(view, event, _slice, moved) {
        if (!view.editable || moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.to;
        void uploadEditorImages(view, files, pos);
        return true;
      },
    },
  });

  async function uploadEditorImages(view: EditorView, files: File[], insertPos?: number) {
    for (const file of files) {
      try {
        const publicUrl = await uploadImageFile(file);
        if (view.isDestroyed) return;
        const node = view.state.schema.nodes.image.create({ src: publicUrl });
        const pos = insertPos ?? view.state.selection.to;
        const tr = view.state.tr.insert(pos, node);
        view.dispatch(tr);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  const imageUpload = useImageUpload(editor);

  // Clear the composer whenever the open thread changes.
  useEffect(() => {
    editor?.commands.setContent('');
    setEditorEmpty(true);
    setError(null);
    setShowSchedule(false);
    setSendAt('');
  }, [selectedId, editor]);

  async function refresh() {
    try {
      const res = await listThreads({
        tab: tab === 'unread' ? 'unread' : undefined,
        q: qRef.current,
        status,
        limit: 50,
        offset: 0,
      });
      setThreads(res.threads);
      setTotal(res.total);
      if (tab === 'scheduled') {
        setScheduled(await listScheduled());
      } else if (res.threads.length > 0 && !res.threads.some((t) => t.id === selectedRef.current)) {
        // Always keep the first item open.
        await openThread(res.threads[0].id);
      } else if (res.threads.length === 0) {
        setSelectedId(null);
        setMessages([]);
      }
    } catch (e) {
      // List errors surface on the right side only, next to the composer.
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, AUTO_FETCH_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status]);

  async function openThread(id: string) {
    requestedThreadRef.current = id;
    setSelectedId(id);
    // Clear immediately — otherwise a slow or failed load leaves the previous
    // thread's messages (including whatever was just replied to) sitting under
    // this thread's subject.
    setMessages([]);
    setLoadingThread(true);
    try {
      const res = await getThread(id);
      if (requestedThreadRef.current !== id) return;
      setMessages(res.messages);
      await patchThread(id, { isRead: true });
      if (requestedThreadRef.current !== id) return;
      setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, isRead: true, unread: false } : t)));
    } catch (e) {
      if (requestedThreadRef.current !== id) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (requestedThreadRef.current === id) setLoadingThread(false);
    }
  }

  function editorContent(): { html: string; text: string } | null {
    if (!editor || editor.isEmpty) return null;
    return { html: editor.getHTML(), text: editor.getText() };
  }

  async function sendReply() {
    if (!selectedId || sending) return;
    const content = editorContent();
    if (!content) return;
    setSending(true);
    setError(null);
    try {
      await replyToThread(selectedId, { ...content, cc: cc || undefined, bcc: bcc || undefined });
      editor?.commands.clearContent();
      // Only refresh the list if the reader hasn't switched threads since.
      if (requestedThreadRef.current === selectedId) {
        const res = await getThread(selectedId);
        if (requestedThreadRef.current === selectedId) setMessages(res.messages);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function sendScheduled() {
    if (!selectedId || sending) return;
    const content = editorContent();
    if (!content || !sendAt) return;
    setSending(true);
    setError(null);
    try {
      await scheduleReply(selectedId, {
        ...content,
        cc: cc || undefined,
        bcc: bcc || undefined,
        sendAt: new Date(sendAt).toISOString(),
      });
      editor?.commands.clearContent();
      setSendAt('');
      setShowSchedule(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  function setLink() {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('Link URL (https://…)');
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  const selected = threads.find((t) => t.id === selectedId);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-base">
      {/* Left: thread list */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-sidebar">
        <div className="flex items-center gap-3 border-b border-border-subtle px-3 py-2 text-[13px] font-medium">
          {['all', 'unread', 'scheduled'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`min-w-0 pb-0.5 ${tab === t ? 'border-b-2 border-accent text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {t === 'all' ? 'All' : t === 'unread' ? 'Unread' : 'Scheduled'}
            </button>
          ))}
          <span className="ml-auto shrink-0 text-[11px] text-text-faint">
            {total === 0 ? '0 threads' : `1-${Math.min(50, total)} of ${total} threads`}
          </span>
        </div>
        <div className="space-y-1.5 border-b border-border-subtle p-2.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && refresh()}
            placeholder="Search conversation"
            className="w-full min-w-0 rounded-md border border-border-default bg-field px-2.5 py-1.5 text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full min-w-0 rounded-md border border-border-default bg-field px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {tab === 'scheduled' ? (
            <div>
              {scheduled.length === 0 && (
                <EmptyState title="Nothing scheduled" hint="Scheduled replies will appear here." />
              )}
              {scheduled.map((s) => (
                <div key={s.id} className="border-b border-border-subtle p-2.5 text-[13px]">
                  <div className="font-medium text-text-secondary">{new Date(s.sendAt).toLocaleString()}</div>
                  <div className="truncate text-text-muted">{s.text.slice(0, 80)}</div>
                  <button
                    onClick={() => cancelScheduled(s.id).then(() => setScheduled(scheduled.filter((x) => x.id !== s.id)))}
                    className="mt-1 text-xs text-danger hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              {threads.length === 0 && (
                <EmptyState title="No replies yet" hint="Threads appear here once a prospect replies." />
              )}
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className={`block w-full min-w-0 border-b border-border-subtle p-2.5 text-left ${selectedId === t.id ? 'bg-accent/10' : 'hover:bg-raised'}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-info-alt to-accent text-[10px] font-semibold text-white">
                      {initials(t.contact?.email)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">
                      {t.contact?.email ?? '(unknown)'}
                    </span>
                    {!t.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </div>
                  <div className="mt-1 truncate pl-9 text-xs text-text-secondary">{t.subject}</div>
                  <div className="mt-1.5 flex min-w-0 gap-1.5 pl-9">
                    <span className={`max-w-full truncate rounded border px-1.5 py-px text-[11px] ${STATUS_PILL[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    {t.isFinished && (
                      <span className="shrink-0 rounded border border-border-subtle px-1.5 py-px text-[11px] text-text-faint">
                        Finished
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Right: thread view */}
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-base p-4">
        {!selected && (
          <EmptyState title="No conversation selected" hint="Choose a thread from the list to read and reply." />
        )}
        {selected && (
          <div className="mx-auto max-w-[860px]">
            <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="mr-auto min-w-0 flex-1 truncate text-[15px] font-semibold text-text-heading">{selected.subject}</h2>
              <select
                value={selected.status}
                onChange={async (e) => {
                  // Capture the value before awaiting — React resets a
                  // controlled select to its last rendered value once the
                  // handler yields, so e.target.value is stale afterwards.
                  const nextStatus = e.target.value as ThreadStatus;
                  await setThreadStatus(selected.id, nextStatus);
                  setThreads((ts) =>
                    ts.map((t) => (t.id === selected.id ? { ...t, status: nextStatus, statusSource: 'manual' } : t)),
                  );
                }}
                className="rounded-md border border-border-default bg-field px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <SourceBadge source={selected.statusSource} />
              <button
                onClick={async () => {
                  await patchThread(selected.id, { isFinished: !selected.isFinished });
                  setThreads((ts) => ts.map((t) => (t.id === selected.id ? { ...t, isFinished: !t.isFinished } : t)));
                }}
                className="rounded-md border border-border-default px-2.5 py-1 text-xs text-text-secondary hover:bg-raised"
              >
                {selected.isFinished ? 'Reopen' : 'Finished'}
              </button>
            </div>
            {loadingThread && (
              <div className="mb-2.5 px-1 py-6 text-center text-xs text-text-faint">
                Loading conversation…
              </div>
            )}
            {!loadingThread &&
              messages.map((m, i) => (
                <MessageCard
                  key={m.id}
                  message={m}
                  // Everything but the two most recent starts collapsed.
                  defaultCollapsed={i < messages.length - 2}
                />
              ))}
            <div className="mt-4 min-w-0 rounded-lg border border-border-subtle bg-panel p-3.5">
              <div className="mb-2 flex min-w-0 items-center gap-2 text-[13px]">
                <span className="shrink-0 text-text-muted">To:</span>
                <span className="min-w-0 flex-1 truncate font-medium text-text-secondary">{selected.contact?.email}</span>
                <button onClick={() => setShowCc(!showCc)} className="shrink-0 text-xs text-text-muted hover:text-text-secondary">
                  Cc / Bcc
                </button>
              </div>
              {showCc && (
                <div className="mb-2 grid gap-1.5">
                  <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Cc, comma separated" className="w-full min-w-0 rounded-md border border-border-default bg-field px-2.5 py-1.5 text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none" />
                  <input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="Bcc, comma separated" className="w-full min-w-0 rounded-md border border-border-default bg-field px-2.5 py-1.5 text-[13px] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none" />
                </div>
              )}
              {/* Basic editor toolbar */}
              <div className="flex items-center gap-0.5 rounded-t-md border border-b-0 border-border-default bg-surface px-1.5 py-1">
                <ToolbarButton active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold"><span className="font-bold">B</span></ToolbarButton>
                <ToolbarButton active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic"><span className="italic">I</span></ToolbarButton>
                <ToolbarButton active={editor?.isActive('strike')} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strikethrough"><span className="line-through">S</span></ToolbarButton>
                <span className="mx-1 h-4 w-px bg-border-default" />
                <ToolbarButton active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list">•—</ToolbarButton>
                <ToolbarButton active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered list">1—</ToolbarButton>
                <ToolbarButton active={editor?.isActive('link')} onClick={setLink} title="Link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton onClick={imageUpload.openFilePicker} title={imageUpload.uploading ? 'Uploading…' : 'Upload image'}>
                  {imageUpload.uploading ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
                      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                </ToolbarButton>
                <input ref={imageUpload.inputRef} type="file" accept="image/*" className="hidden" onChange={imageUpload.handleFileChange} />
              </div>
              <div className="min-h-[140px] rounded-b-md border border-border-default bg-field px-2.5 py-2 text-[13px] text-text-primary focus-within:border-accent [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none [&_a]:text-accent-light [&_a]:underline [&_img]:max-w-full [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1">
                <EditorContent editor={editor} />
              </div>
              {imageUpload.error && <div className="mt-2 max-w-full break-words text-xs text-danger">{imageUpload.error}</div>}
              {error && <div className="mt-2 max-w-full break-words text-xs text-danger">{error}</div>}
              <div className="relative mt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowSchedule((v) => !v)}
                  title="Schedule send"
                  className={`flex h-8 w-8 items-center justify-center rounded-md border text-text-muted hover:bg-raised hover:text-text-secondary ${showSchedule ? 'border-accent text-accent-light' : 'border-border-strong'}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="7" x2="12" y2="12" />
                    <line x1="12" y1="12" x2="15.5" y2="14" />
                  </svg>
                </button>
                {showSchedule && (
                  <div className="absolute bottom-10 right-0 z-10 flex items-center gap-2 rounded-lg border border-border-modal bg-panel2 p-2.5 shadow-xl">
                    <input
                      type="datetime-local"
                      value={sendAt}
                      onChange={(e) => setSendAt(e.target.value)}
                      className="rounded-md border border-border-default bg-field px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
                    />
                    <button
                      onClick={sendScheduled}
                      disabled={editorEmpty || !sendAt || sending}
                      className="rounded-md border border-border-strong px-3 py-1.5 text-[13px] text-text-secondary hover:bg-raised disabled:opacity-40"
                    >
                      Schedule
                    </button>
                  </div>
                )}
                <button onClick={() => editor?.commands.clearContent()} className="rounded-md px-3 py-1.5 text-[13px] text-text-muted hover:text-text-secondary">
                  Discard
                </button>
                <button
                  onClick={sendReply}
                  disabled={editorEmpty || sending}
                  className="rounded-md bg-accent px-4 py-1.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-40"
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
