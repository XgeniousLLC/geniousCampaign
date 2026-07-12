import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../lib/authApi';

export function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('This reset link is missing its token — request a new one.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-base text-text-primary">
      <div className="w-full max-w-[340px] p-8">
        <h1 className="mb-1.5 text-[22px] font-semibold tracking-tight text-text-heading">Set a new password</h1>
        <p className="mb-[26px] text-[13px] text-text-muted">Choose a new password for your account.</p>

        {done ? (
          <div className="rounded-[9px] border border-success/25 bg-success/10 p-3 text-[13px] text-success">
            Password reset — redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">New password</label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              minLength={8}
              placeholder="••••••••"
              className="mb-3 h-10 w-full rounded-[9px] border border-border-subtle bg-surface px-3 font-mono text-[13.5px] text-text-primary outline-none"
            />
            {error && <div className="mb-2.5 text-xs text-danger">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-[9px] bg-accent text-[13.5px] font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Resetting…' : 'Reset password'}
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
