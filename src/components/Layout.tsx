import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Workspace = 'compliance' | 'hr';

const sharedNav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/workers', label: 'Workers' },
];

const complianceNav = [
  { to: '/right-to-work', label: 'Right to Work' },
  { to: '/employment', label: 'Employment & CoS' },
  { to: '/absences', label: 'Absence Monitoring' },
  { to: '/documents', label: 'Documents & Retention' },
  { to: '/reporting', label: 'Change Reporting' },
  { to: '/policies', label: 'Policies' },
  { to: '/audit', label: 'Audit Trail' },
  { to: '/reports', label: 'Reports' },
];

const hrNav = [
  { to: '/leave', label: 'Leave & Holiday' },
  { to: '/sickness', label: 'Sickness' },
  { to: '/onboarding', label: 'Onboarding' },
  { to: '/hr-documents', label: 'HR Documents' },
];

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative block rounded-md px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-ink-700 text-white'
            : 'text-slate-300/80 hover:bg-ink-700/60 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-brass" />
          )}
          {label}
        </>
      )}
    </NavLink>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace>('compliance');

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const displayName = profile?.full_name || session?.user.email || 'User';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'authorising_officer';
  const moduleNav = workspace === 'compliance' ? complianceNav : hrNav;

  return (
    <div className="flex min-h-screen">
      {/* Command rail */}
      <aside className="flex w-64 flex-col bg-ink text-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brass font-mono text-sm font-semibold text-ink">
            DL
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">DL Compliance</p>
            <p className="text-2xs leading-tight text-slate-400">Sponsor &amp; People</p>
          </div>
        </div>

        {/* Workspace switch */}
        <div className="mx-3 mb-3 grid grid-cols-2 gap-1 rounded-lg bg-ink-800 p-1">
          {(['compliance', 'hr'] as Workspace[]).map((w) => (
            <button
              key={w}
              onClick={() => setWorkspace(w)}
              className={`rounded-md py-1.5 text-xs font-medium capitalize transition ${
                workspace === w ? 'bg-brass text-ink' : 'text-slate-300 hover:text-white'
              }`}
            >
              {w === 'hr' ? 'HR' : 'Compliance'}
            </button>
          ))}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {sharedNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <div className="my-2 border-t border-ink-700" />
          {moduleNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-ink-700" />
              <NavItem to="/settings" label="Settings" />
            </>
          )}
        </nav>

        <div className="border-t border-ink-700 px-3 py-3">
          <p className="truncate px-3 text-xs font-medium text-white">{displayName}</p>
          <p className="mb-2 px-3 text-2xs capitalize text-slate-400">
            {profile?.role?.replace(/_/g, ' ') ?? ''}
          </p>
          <button
            onClick={handleSignOut}
            className="w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-ink-700 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Workspace */}
      <main className="flex-1 overflow-auto bg-paper">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
