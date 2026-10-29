import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isConfigured } from '@/lib/supabase';

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brass font-mono text-lg font-semibold text-ink">
            DL
          </div>
          <h1 className="text-xl font-semibold text-white">DL Compliance</h1>
          <p className="mt-1 text-sm text-slate-400">DL Business Systems Ltd</p>
        </div>

        {!isConfigured && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Supabase is not configured yet. Set the environment variables, then reload.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-raised">
          <div>
            <label className="mb-1 block text-sm font-medium text-content" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brass focus:outline-none"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-content" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brass focus:outline-none"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-rag-red">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-ink py-2 text-sm font-semibold text-white transition hover:bg-ink-700 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Internal system. Authorised users only.
        </p>
      </div>
    </div>
  );
}
