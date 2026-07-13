import { useState } from 'react';
import { sendTestEmail } from '../lib/templatesApi';

const LAST_TEST_EMAIL_KEY = 'gc_last_test_email';

// Small anchored popover (not a full-screen modal) — opens right under the
// "Send test" button that triggered it. The address is remembered in
// localStorage so repeat test-sends (the common case while iterating on a
// template) don't require retyping the same email every time.
export function SendTestEmailModal({
  subject,
  bodyHtml,
  bodyText,
  defaultEmail,
  onClose,
}: {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  defaultEmail: string;
  onClose: () => void;
}) {
  const [to, setTo] = useState(() => localStorage.getItem(LAST_TEST_EMAIL_KEY) || defaultEmail);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    const email = to.trim();
    if (!email || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendTestEmail({ to: email, subject, bodyHtml, bodyText });
      localStorage.setItem(LAST_TEST_EMAIL_KEY, email);
      setResult({ ok: true, text: `Sent via ${res.provider === 'ses' ? 'SES' : 'Gmail'} — check ${email}.` });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Send failed.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 z-[70] cursor-default bg-transparent" />
      <div
        className="absolute right-0 top-full z-[71] mt-2 w-[340px] rounded-lg border border-border-modal bg-panel2 p-3.5 shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onClose();
        }}
      >
        <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Send test to</label>
        <div className="flex gap-1.5">
          <input
            autoFocus
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            className="h-8 min-w-0 flex-1 rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={sending || !to.trim()}
            className="h-8 shrink-0 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <p className="mt-2 text-[10.5px] leading-snug text-text-faint">
          Real send via live sender accounts, subject prefixed <span className="font-mono">[Test]</span>. Tokens resolve against sample
          data.
        </p>
        {result && (
          <div
            className={`mt-2 rounded-md border px-2.5 py-1.5 text-[11px] ${result.ok ? 'border-success/25 bg-success/10 text-success' : 'border-danger/25 bg-danger/10 text-danger'}`}
          >
            {result.text}
          </div>
        )}
      </div>
    </>
  );
}
