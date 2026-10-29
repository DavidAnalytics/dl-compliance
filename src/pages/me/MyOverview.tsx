import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyWorker } from '@/lib/me';
import { Card, SectionLabel } from '@/components/ui';
import { fullName, formatDate } from '@/lib/compliance';
import type { Worker, LeaveRequest, LeaveEntitlement } from '@/types/database';

const YEAR = new Date().getFullYear();

export function MyOverview() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [ent, setEnt] = useState<LeaveEntitlement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!session) return;
      const w = await fetchMyWorker(session.user.id);
      setWorker(w);
      if (w) {
        const [r, e] = await Promise.all([
          supabase.from('leave_requests').select('*').eq('worker_id', w.id).order('start_date', { ascending: false }),
          supabase.from('leave_entitlements').select('*').eq('worker_id', w.id).eq('year', YEAR).maybeSingle(),
        ]);
        setRequests((r.data as LeaveRequest[]) ?? []);
        setEnt((e.data as LeaveEntitlement) ?? null);
      }
      setLoading(false);
    })();
  }, [session]);

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  const name = worker ? fullName(worker).split(' ')[0] : (session?.user.email ?? 'there');
  const taken = requests.filter((r) => r.status === 'approved').reduce((s, r) => s + (r.working_days ?? 0), 0);
  const entitlement = ent ? ent.entitlement_days + ent.carried_over_days : 28;
  const pending = requests.filter((r) => r.status === 'pending');
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = requests.filter((r) => r.status === 'approved' && r.start_date >= today).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-brand-gradient p-5 sm:p-7 text-white shadow-nav">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Hello, {name}</h1>
            <p className="mt-1 text-sm text-white/80">Your leave, details and documents in one place.</p>
          </div>
          <button onClick={() => navigate('/me/leave')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-white/90">
            <CalendarPlus size={16} /> Request leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Leave remaining</p><p className="mt-1 text-3xl font-extrabold text-ink">{Math.max(entitlement - taken, 0)}<span className="text-base text-ink-faint"> days</span></p></Card>
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Pending requests</p><p className="mt-1 text-3xl font-extrabold text-ink">{pending.length}</p></Card>
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Taken this year</p><p className="mt-1 text-3xl font-extrabold text-ink">{taken}</p></Card>
      </div>

      <Card className="p-6">
        <SectionLabel action={<button onClick={() => navigate('/me/leave')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">My leave <ArrowRight size={14} /></button>}>Upcoming leave</SectionLabel>
        {upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No upcoming leave booked.</p>
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink">{formatDate(r.start_date)} – {formatDate(r.end_date)}</span>
                <span className="text-xs text-ink-faint">{r.working_days ?? 0} days</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
