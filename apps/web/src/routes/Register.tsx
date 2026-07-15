import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../lib/authApi';
import { useAuthStore } from '../stores/useAuthStore';

export function Register() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter an email and password to continue.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const resp = await register(email, password);
      setSession(resp.accessToken, resp.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base text-text-primary">
      <div className="flex min-w-0 flex-1 items-center justify-center p-8">
        <div className="w-full max-w-[340px]">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent-hover shadow-[0_2px_10px_rgba(79,70,229,.45)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4z" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight text-text-heading">geniusCampaign</span>
              <a href="https://xgenious.com" target="_blank" rel="noreferrer" className="text-[11px] font-medium text-text-faint hover:text-text-tertiary">
                by xgenious.com
              </a>
            </div>
          </div>

          <h1 className="mb-1.5 text-[22px] font-semibold tracking-tight text-text-heading">Create account</h1>
          <p className="mb-[26px] text-[13px] text-text-muted">
            The first account created here becomes the workspace owner.
          </p>

          <form onSubmit={submit}>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Work email</label>
            <div className="mb-3.5 flex h-10 items-center gap-2 rounded-[9px] border border-border-subtle bg-surface px-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5B6270" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 6-10 7L2 6" />
              </svg>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                type="email"
                className="flex-1 bg-transparent text-[13.5px] text-text-primary outline-none"
              />
            </div>

            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Password</label>
            <div className="mb-3.5 flex h-10 items-center gap-2 rounded-[9px] border border-border-subtle bg-surface px-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5B6270" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="At least 8 characters"
                minLength={8}
                className="flex-1 bg-transparent font-mono text-[13.5px] text-text-primary outline-none"
              />
            </div>

            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Confirm password</label>
            <div className="mb-2 flex h-10 items-center gap-2 rounded-[9px] border border-border-subtle bg-surface px-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5B6270" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                minLength={8}
                className="flex-1 bg-transparent font-mono text-[13.5px] text-text-primary outline-none"
              />
            </div>

            {error && <div className="mb-2.5 text-xs text-danger">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full rounded-[9px] bg-accent text-[13.5px] font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Please wait…' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-[12.5px] text-text-tertiary">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent-light hover:text-accent-lighter">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div
        className="flex min-w-0 flex-1 flex-col justify-center border-l border-border-subtle p-12"
        style={{ background: 'radial-gradient(120% 100% at 100% 0%, rgba(99,102,241,.14), transparent 55%), #0D0E12' }}
      >
        <div className="max-w-[400px]">
          <h2 className="mb-3.5 text-[26px] font-semibold leading-[1.25] tracking-tight text-text-heading">
            Send smarter across SES &amp; every Gmail mailbox.
          </h2>
          <p className="mb-[30px] text-sm leading-relaxed text-text-tertiary">
            Contacts, sequences, templates with spintax, and quota-aware sending — all in one internal console.
          </p>
        </div>
      </div>
    </div>
  );
}
