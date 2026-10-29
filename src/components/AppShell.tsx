import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Mail, Search, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui';

interface AlertRow { id: string; severity: string; title: string; detail: string | null; due_date: string | null; }
import {
  hrNav, hrFooterNav, complianceNav, complianceFooterNav, workerNav, APP_META, type AppKey, type NavItem,
} from '@/config/nav';
import { isStaff } from '@/lib/roles';

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
          isActive
            ? 'bg-white text-brand-600 shadow-sm'
            : 'text-white/75 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <Icon size={18} strokeWidth={2.2} />
      {item.label}
    </NavLink>
  );
}

export function AppShell({ app, children }: { app: AppKey; children: React.ReactNode }) {
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const closeSidebar = () => setSidebarOpen(false);

  const canSeeAlerts = isStaff(profile?.role);
  useEffect(() => {
    if (!canSeeAlerts) return;
    supabase.from('alerts').select('id,severity,title,detail,due_date').eq('status', 'open').order('due_date')
      .then(({ data }) => setAlerts((data as AlertRow[]) ?? []));
  }, [canSeeAlerts]);

  const employee = app === 'employee';
  const staff = isStaff(profile?.role);
  const meta = APP_META[app];
  const AppIcon = meta.icon;
  const nav = employee ? workerNav : app === 'hr' ? hrNav : complianceNav;
  const footer = employee ? [] : app === 'hr' ? hrFooterNav : complianceFooterNav;
  const other: AppKey = app === 'hr' ? 'compliance' : 'hr';

  const displayName = profile?.full_name || session?.user.email || 'User';
  const roleLabel = profile?.role?.replace(/_/g, ' ') ?? '';

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={closeSidebar} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col bg-brand-gradient px-4 py-6 shadow-nav transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-7 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">
            <AppIcon size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight text-white">{meta.name}</p>
            <p className="text-2xs font-medium leading-tight text-white/60">{meta.tag}</p>
          </div>
        </div>

        <nav className="thin-scroll flex-1 space-y-1 overflow-y-auto">
          {nav.map((item) => <SidebarLink key={item.to} item={item} onNavigate={closeSidebar} />)}
        </nav>

        <div className="mt-3 space-y-1 border-t border-white/15 pt-3">
          {footer.map((item) => <SidebarLink key={item.to} item={item} onNavigate={closeSidebar} />)}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} strokeWidth={2.2} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-canvas/80 px-4 py-3.5 backdrop-blur sm:gap-4 lg:px-8">
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(true)} className="rounded-xl border border-line bg-white p-2.5 text-ink-muted lg:hidden" aria-label="Open menu">
            <Menu size={18} />
          </button>
          {/* App switch (staff only) */}
          {staff && !employee && (
            <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-card">
              {(['hr', 'compliance'] as AppKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => navigate(APP_META[k].home)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    k === app ? 'bg-brand-500 text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {k === 'hr' ? 'HR' : 'Compliance'}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative hidden flex-1 md:block">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              placeholder={`Search ${meta.name}…`}
              className="w-full max-w-md rounded-xl border border-line bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-faint focus:border-brand-300 focus:outline-none"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {staff && (
            <div className="relative">
              <button onClick={() => setBellOpen((o) => !o)} className="relative rounded-xl border border-line bg-white p-2.5 text-ink-muted hover:text-ink" aria-label="Notifications">
                <Bell size={18} />
                {alerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rag-red px-1 text-[10px] font-bold text-white">{alerts.length}</span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-line bg-white p-2 shadow-pop">
                  <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">Alerts</p>
                  {alerts.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-ink-muted">Nothing needs attention.</p>
                  ) : (
                    <ul className="max-h-80 overflow-auto thin-scroll">
                      {alerts.map((a) => (
                        <li key={a.id} className="flex gap-2 rounded-lg px-2 py-2 hover:bg-canvas">
                          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${a.severity === 'red' ? 'bg-rag-red' : a.severity === 'info' ? 'bg-brand-500' : 'bg-rag-amber'}`} />
                          <div className="min-w-0"><p className="text-sm font-semibold text-ink">{a.title}</p><p className="truncate text-xs text-ink-muted">{a.detail}</p></div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            )}
            {staff && (
            <button className="rounded-xl border border-line bg-white p-2.5 text-ink-muted hover:text-ink" aria-label="Messages">
              <Mail size={18} />
            </button>
            )}

            {/* Profile */}
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 pl-1.5 pr-3">
                <Avatar name={displayName} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-bold leading-tight text-ink">{displayName}</span>
                  <span className="block text-2xs capitalize leading-tight text-ink-faint">{roleLabel}</span>
                </span>
                <ChevronDown size={14} className="text-ink-faint" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-line bg-white p-1 shadow-pop">
                  {staff && !employee && (
                    <button onClick={() => navigate(APP_META[other].home)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-canvas">
                      Switch to {APP_META[other].name}
                    </button>
                  )}
                  <button onClick={handleSignOut} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-canvas">
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="thin-scroll flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
