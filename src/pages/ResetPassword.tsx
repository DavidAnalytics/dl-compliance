import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // The reset email lands here with a recovery token in the URL, which the
  // Supabase client turns into a temporary session. Wait for that session
  // before allowing a new password to be set.
  useEffect(() => {
    let settled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setReady(true); settled = true; }
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        setReady(true); settled = true; setChecking(false);
      }
    });
    // give the client a moment to parse the URL, then stop the spinner
    const t = setTimeout(() => { if (!settled) setChecking(false); }, 2500);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) { setError(error); return; }
    setDone(true);
    setTimeout(() => navigate('/'), 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-extrabold text-white">DL</div>
          <h2 className="text-xl font-bold text-ink">Set a new password</h2>
        </div>

        {checking ? (
          <p className="text-center text-sm text-ink-muted">Checking your link…</p>
        ) : done ? (
          <div className="rounded-xl border border-rag-green/30 bg-rag-greenbg p-3.5 text-center text-sm text-ink">
            Password updated. Taking you in…
          </div>
        ) : !ready ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-rag-amber/40 bg-rag-amberbg p-3.5 text-sm text-rag-amber">
              This reset link is invalid or has expired. Request a new one from the sign-in screen.
            </div>
            <button onClick={() => navigate('/login')}
              className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600">
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-muted" htmlFor="new-password">New password</label>
              <input id="new-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-muted" htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none" />
            </div>
            {error && <p className="text-sm text-rag-red">{error}</p>}
            <button type="submit" disabled={busy}
              className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60">
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
