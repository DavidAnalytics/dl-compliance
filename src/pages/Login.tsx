import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isConfigured } from '@/lib/supabase';

export function Login() {
  const { signIn, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error); else navigate('/');
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    const { error } = await requestPasswordReset(email);
    setBusy(false);
    if (error) setError(error); else setSent(true);
  }

  function switchMode(next: 'signin' | 'forgot') {
    setMode(next); setError(null); setSent(false); setPassword('');
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-gradient p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-extrabold backdrop-blur">DL</div>
          <span className="font-bold">DL Business Systems</span>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">People and compliance,<br />in one place.</h1>
          <p className="mt-3 max-w-md text-white/80">
            Manage your team and keep the sponsor licence duties under control, from one secure system.
          </p>
        </div>
        <p className="text-xs text-white/60">Internal system. Authorised users only.</p>
      </div>

      {/* Form */}
      <div className="flex w-full flex-col items-center justify-center bg-canvas px-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-extrabold text-white">DL</div>
          </div>
          <h2 className="text-xl font-bold text-ink">{mode === 'signin' ? 'Sign in' : 'Reset your password'}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {mode === 'signin'
              ? 'Welcome back. Enter your details to continue.'
              : 'Enter your email and we will send you a link to set a new password.'}
          </p>

          {!isConfigured && (
            <div className="mt-4 rounded-xl border border-rag-amber/40 bg-rag-amberbg p-3 text-sm text-rag-amber">
              Supabase is not configured yet. Set the environment variables, then reload.
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-muted" htmlFor="email">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-ink-muted" htmlFor="password">Password</label>
                  <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Forgot password?</button>
                </div>
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none" />
              </div>
              {error && <p className="text-sm text-rag-red">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60">
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : sent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-rag-green/30 bg-rag-greenbg p-3.5 text-sm text-ink">
                If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. Check the inbox and follow the link to set a new password.
              </div>
              <button type="button" onClick={() => switchMode('signin')}
                className="w-full rounded-xl border border-line bg-white py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-muted" htmlFor="reset-email">Email</label>
                <input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none" />
              </div>
              {error && <p className="text-sm text-rag-red">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60">
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => switchMode('signin')} className="w-full text-center text-xs font-semibold text-ink-faint hover:text-ink">
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
