import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Home() {
  const navigate = useNavigate();
  const { profile, session, signOut } = useAuth();
  const name = (profile?.full_name || session?.user.email || '').split(' ')[0] || 'there';

  const cards = [
    {
      key: 'hr',
      to: '/hr',
      icon: Users,
      title: 'DL People',
      tag: 'Human Resources',
      blurb: 'Employees, leave and absence for the whole team.',
    },
    {
      key: 'compliance',
      to: '/compliance',
      icon: ShieldCheck,
      title: 'DL Compliance',
      tag: 'Sponsor Duties',
      blurb: 'Right to work, records and the sponsor licence duties.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-sm font-extrabold text-white shadow-nav">
            DL
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Welcome back, {name}</h1>
          <p className="mt-1 text-sm text-ink-muted">Choose a workspace to continue.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => navigate(c.to)}
                className="group rounded-2xl border border-line bg-surface p-6 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white">
                  <Icon size={22} strokeWidth={2.3} />
                </div>
                <p className="text-2xs font-bold uppercase tracking-wide text-brand-500">{c.tag}</p>
                <h2 className="mt-0.5 text-lg font-bold text-ink">{c.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{c.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                  Open
                  <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => { void signOut(); navigate('/login'); }} className="text-xs font-medium text-ink-faint hover:text-ink">
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
