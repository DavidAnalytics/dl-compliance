import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarOff, Plane, Plus, CalendarPlus, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, SectionLabel, Avatar } from '@/components/ui';
import { fullName, formatDate } from '@/lib/compliance';
import type { Worker, Absence } from '@/types/database';

interface AuditRow { id: number; actor_email: string | null; summary: string | null; created_at: string; }

const DEFAULT_ENTITLEMENT = 28; // UK statutory default until configured per worker

function StatCard({ icon: Icon, tint, label, value, sub }: {
  icon: typeof Users; tint: string; label: string; value: string; sub?: string;
}) {
  return (
    <Card className="p-5">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={20} strokeWidth={2.3} />
      </div>
      <p className="text-3xl font-extrabold text-ink">{value}</p>
      <p className="text-sm font-semibold text-ink">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </Card>
  );
}

export function HrDashboard() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [activity, setActivity] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: w }, { data: a }, { data: act }] = await Promise.all([
        supabase.from('workers').select('*').neq('employment_status', 'left'),
        supabase.from('absences').select('*').order('start_date', { ascending: false }),
        supabase.from('audit_log').select('id,actor_email,summary,created_at').order('created_at', { ascending: false }).limit(6),
      ]);
      setWorkers((w as Worker[]) ?? []);
      setAbsences((a as Absence[]) ?? []);
      setActivity((act as AuditRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const onLeaveToday = absences.filter((a) => a.start_date <= todayStr && a.end_date >= todayStr);
  const yearStart = `${today.getFullYear()}-01-01`;
  const holidayTaken = absences
    .filter((a) => a.absence_type === 'holiday' && a.start_date >= yearStart)
    .reduce((sum, a) => sum + (a.working_days ?? 0), 0);
  const upcomingLeave = absences
    .filter((a) => a.start_date > todayStr)
    .sort((x, y) => x.start_date.localeCompare(y.start_date))
    .slice(0, 4);
  const remaining = Math.max(DEFAULT_ENTITLEMENT - holidayTaken, 0);
  const dateLabel = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return <p className="text-sm text-ink-muted">Loading dashboard…</p>;

  const workerName = (id: string) => {
    const w = workers.find((x) => x.id === id);
    return w ? fullName(w) : 'A worker';
  };

  return (
    <div className="space-y-6">
      {/* Welcome panel */}
      <div className="overflow-hidden rounded-2xl bg-brand-gradient p-7 text-white shadow-nav">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">{dateLabel}</p>
            <h1 className="mt-1 text-2xl font-extrabold">People at DL Business Systems</h1>
            <p className="mt-1 max-w-lg text-sm text-white/80">
              Your team at a glance. Manage employees, leave and absence from one place.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/hr/leave')} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
              <CalendarPlus size={16} /> Request leave
            </button>
            <button onClick={() => navigate('/hr/employees')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-white/90">
              <Plus size={16} /> Add employee
            </button>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Users} tint="bg-brand-50 text-brand-600" label="Employees" value={String(workers.length)} sub="Active and onboarding" />
        <StatCard icon={Plane} tint="bg-rag-greenbg text-rag-green" label="On leave today" value={String(onLeaveToday.length)} sub={onLeaveToday.length ? onLeaveToday.map((a) => workerName(a.worker_id)).join(', ') : 'Everyone in'} />
        <StatCard icon={CalendarOff} tint="bg-rag-amberbg text-rag-amber" label="Absences logged" value={String(absences.length)} sub="All time" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Leave balance */}
        <Card className="p-6 lg:col-span-1">
          <SectionLabel>Annual leave</SectionLabel>
          <div className="mt-2 flex items-end gap-6">
            <div>
              <p className="text-4xl font-extrabold text-ink">{remaining}</p>
              <p className="text-xs font-semibold text-ink-muted">days remaining</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-muted">{holidayTaken}</p>
              <p className="text-xs font-semibold text-ink-faint">days taken</p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min((holidayTaken / DEFAULT_ENTITLEMENT) * 100, 100)}%` }} />
          </div>
          <p className="mt-3 text-2xs text-ink-faint">Based on a {DEFAULT_ENTITLEMENT}-day default. Per-employee entitlements are set in Settings.</p>
        </Card>

        {/* Upcoming leave */}
        <Card className="p-6 lg:col-span-2">
          <SectionLabel action={<button onClick={() => navigate('/hr/leave')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">View all <ArrowRight size={14} /></button>}>Upcoming leave</SectionLabel>
          {upcomingLeave.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">No upcoming leave booked.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcomingLeave.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <Avatar name={workerName(a.worker_id)} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{workerName(a.worker_id)}</p>
                    <p className="text-xs capitalize text-ink-faint">{a.absence_type}</p>
                  </div>
                  <p className="text-xs font-medium text-ink-muted">{formatDate(a.start_date)} – {formatDate(a.end_date)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="p-6">
        <SectionLabel>Recent activity</SectionLabel>
        {activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {activity.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink">{e.summary ?? 'Change recorded'}</span>
                <span className="text-xs text-ink-faint">{new Date(e.created_at).toLocaleString('en-GB')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
