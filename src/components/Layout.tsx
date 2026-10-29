import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/workers', label: 'Engaged Workers' },
  { to: '/right-to-work', label: 'Right to Work & eVisa' },
  { to: '/absences', label: 'Travel & Absence' },
  { to: '/dbs', label: 'DBS Tracking' },
  { to: '/documents', label: 'Documents' },
  { to: '/policies', label: 'Policies' },
  { to: '/reporting', label: 'Reporting & SMS' },
  { to: '/governance', label: 'Key Personnel' },
  { to: '/audit', label: 'Audit Trail' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const displayName = profile?.full_name || session?.user.email || 'User';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
            DL
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">DL Compliance</p>
            <p className="text-xs leading-tight text-slate-400">Sponsor & People</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <p className="truncate px-3 text-xs text-slate-500">{displayName}</p>
          <p className="mb-2 px-3 text-xs capitalize text-slate-400">
            {profile?.role?.replace(/_/g, ' ') ?? ''}
          </p>
          <button
            onClick={handleSignOut}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
