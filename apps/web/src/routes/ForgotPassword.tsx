import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../lib/authApi';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-base text-text-primary">
      <div className="w-full max-w-[340px] p-8">
        <h1 className="mb-1.5 text-[22px] font-semibold tracking-tight text-text-heading">Reset password</h1>
        <p className="mb-[26px] text-[13px] text-text-muted">
          Enter your work email and we'll send you a reset link.
        </p>

        {sent ? (
          <div className="rounded-[9px] border border-success/25 bg-success/10 p-3 text-[13px] text-success">
            If that email has an account, a reset link has been sent — check your inbox.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Work email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@company.com"
              className="mb-3 h-10 w-full rounded-[9px] border border-border-subtle bg-surface px-3 text-[13.5px] text-text-primary outline-none"
            />
            {error && <div className="mb-2.5 text-xs text-danger">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-[9px] bg-accent text-[13.5px] font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-center text-[11.5px] text-text-muted hover:text-text-primary">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
