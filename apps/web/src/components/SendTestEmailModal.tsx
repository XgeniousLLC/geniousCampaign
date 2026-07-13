import { useState } from 'react';
import { sendTestEmail } from '../lib/templatesApi';

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
  const [to, setTo] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    if (!to.trim() || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendTestEmail({ to: to.trim(), subject, bodyHtml, bodyText });
      setResult({ ok: true, text: `Sent via ${res.provider === 'ses' ? 'SES' : 'Gmail'} — check ${to.trim()}.` });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Send failed.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="w-[420px] max-w-full rounded-xl border border-border-modal bg-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <h3 className="text-sm font-semibold text-text-heading">Send test email</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>

        <div className="p-[18px]">
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Send to</label>
          <input
            autoFocus
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
          />
          <p className="mt-2 text-[11px] text-text-faint">
            Sends a real email through this app's live sender accounts (real quota is used) — subject prefixed with{' '}
            <span className="font-mono">[Test]</span>. Personalization tokens resolve against sample data, not a real contact.
          </p>
          {result && (
            <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${result.ok ? 'border-success/25 bg-success/10 text-success' : 'border-danger/25 bg-danger/10 text-danger'}`}>
              {result.text}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface px-[18px] py-3.5">
          <button
            onClick={onClose}
            className="h-[34px] rounded-md border border-border-subtle bg-surface px-3.5 text-sm font-medium text-text-secondary hover:bg-raised"
          >
            Close
          </button>
          <button
            onClick={submit}
            disabled={sending || !to.trim()}
            className="h-[34px] rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send test'}
          </button>
        </div>
      </div>
    </div>
  );
}
