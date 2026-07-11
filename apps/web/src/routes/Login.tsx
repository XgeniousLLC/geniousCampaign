import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../lib/authApi';
import { useAuthStore } from '../stores/useAuthStore';

export function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = mode === 'login' ? await login(email, password) : await register(email, password);
      setSession(resp.accessToken, resp.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <form onSubmit={submit} className="w-80 rounded-lg border border-border-default bg-panel p-6">
        <div className="mb-5 text-center text-sm font-semibold text-text-heading">geniusCampaign</div>
        <h1 className="mb-4 text-center text-base font-semibold text-text-primary">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>

        <label className="mb-1 block text-xs text-text-muted">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-3 h-9 w-full rounded-md border border-border-strong bg-field px-3 text-sm text-text-primary outline-none"
        />

        <label className="mb-1 block text-xs text-text-muted">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mb-4 h-9 w-full rounded-md border border-border-strong bg-field px-3 text-sm text-text-primary outline-none"
        />

        {error && <div className="mb-3 text-xs text-danger">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="h-9 w-full rounded-md bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-3 w-full text-center text-xs text-text-muted hover:text-text-primary"
        >
          {mode === 'login' ? 'First time? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
