import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyWorker } from '@/lib/me';
import { PageHeader, Card, Button } from '@/components/ui';
import { formatDate, workingDaysBetween } from '@/lib/compliance';
import type { Worker, LeaveType, LeaveRequest, LeaveEntitlement, BankHoliday } from '@/types/database';

const YEAR = new Date().getFullYear();
const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const statusStyle: Record<string, string> = {
  pending: 'bg-rag-amberbg text-rag-amber', approved: 'bg-rag-greenbg text-rag-green',
  rejected: 'bg-rag-redbg text-rag-red', cancelled: 'bg-canvas text-ink-faint',
};

function absenceHoliday(name?: string) { return (name ?? '').toLowerCase().includes('annual') || (name ?? '').toLowerCase().includes('holiday'); }

export function MyLeave() {
  const { session } = useAuth();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [ent, setEnt] = useState<LeaveEntitlement | null>(null);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [booking, setBooking] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session) return;
    const w = await fetchMyWorker(session.user.id);
    setWorker(w);
    if (!w) { setLoading(false); return; }
    const [t, r, e, bh] = await Promise.all([
      supabase.from('leave_types').select('*').eq('active', true).order('name'),
      supabase.from('leave_requests').select('*').eq('worker_id', w.id).order('start_date', { ascending: false }),
      supabase.from('leave_entitlements').select('*').eq('worker_id', w.id).eq('year', YEAR).maybeSingle(),
      supabase.from('bank_holidays').select('*'),
    ]);
    setTypes((t.data as LeaveType[]) ?? []);
    setRequests((r.data as LeaveRequest[]) ?? []);
    setEnt((e.data as LeaveEntitlement) ?? null);
    setHolidays(new Set(((bh.data as BankHoliday[]) ?? []).map((h) => h.holiday_date)));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [session]);

  const typeOf = (id: string | null) => types.find((x) => x.id === id);
  const taken = requests.filter((r) => r.status === 'approved' && absenceHoliday(typeOf(r.leave_type_id)?.name) && r.start_date.slice(0, 4) === String(YEAR))
    .reduce((s, r) => s + (r.working_days ?? 0), 0);
  const entitlement = ent ? ent.entitlement_days + ent.carried_over_days : 28;
  const remaining = Math.max(entitlement - taken, 0);

  async function cancel(r: LeaveRequest) {
    await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', r.id);
    load();
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (!worker) return <p className="text-sm text-ink-muted">No employee record is linked to your account yet. Contact HR.</p>;

  return (
    <div>
      <PageHeader title="My Leave" subtitle="Your balance, requests and their status."
        actions={<Button onClick={() => setBooking(true)}><span className="inline-flex items-center gap-1.5"><Plus size={16} /> Request leave</span></Button>} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Remaining</p><p className="mt-1 text-3xl font-extrabold text-ink">{remaining}<span className="text-base text-ink-faint"> days</span></p></Card>
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Taken</p><p className="mt-1 text-3xl font-extrabold text-ink">{taken}</p></Card>
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Entitlement {YEAR}</p><p className="mt-1 text-3xl font-extrabold text-ink">{entitlement}</p></Card>
      </div>

      <h2 className="mb-3 text-base font-bold text-ink">My requests</h2>
      {requests.length === 0 ? (
        <Card className="px-6 py-8 text-center text-sm text-ink-muted">No requests yet.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Type</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Days</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((r) => (
                <tr key={r.id} className="text-ink-muted">
                  <td className="px-5 py-3 text-ink">{typeOf(r.leave_type_id)?.name ?? '—'}</td>
                  <td className="px-5 py-3">{formatDate(r.start_date)} – {formatDate(r.end_date)}</td>
                  <td className="px-5 py-3">{r.working_days ?? '—'}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[r.status]}`}>{r.status}</span></td>
                  <td className="px-5 py-3 text-right">{(r.status === 'pending' || r.status === 'approved') && <button onClick={() => cancel(r)} className="text-xs font-semibold text-ink-faint hover:text-rag-red">Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {booking && <RequestLeave worker={worker} types={types} holidays={holidays} onClose={() => setBooking(false)} onBooked={() => { setBooking(false); load(); }} />}
    </div>
  );
}

function RequestLeave({ worker, types, holidays, onClose, onBooked }: {
  worker: Worker; types: LeaveType[]; holidays: Set<string>; onClose: () => void; onBooked: () => void;
}) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const days = start && end ? workingDaysBetween(start, end, holidays) : 0;

  async function submit() {
    if (!typeId || !start || !end) return;
    setSaving(true);
    await supabase.from('leave_requests').insert({
      worker_id: worker.id, leave_type_id: typeId, start_date: start, end_date: end,
      working_days: days, reason: reason || null, status: 'pending',
    });
    setSaving(false); onBooked();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">Request leave</h2>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Type</label>
            <select className={field} value={typeId} onChange={(e) => setTypeId(e.target.value)}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">From</label><input type="date" className={field} value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">To</label><input type="date" className={field} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Reason (optional)</label><input className={field} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          {start && end && <div className="rounded-xl bg-canvas px-4 py-2.5 text-sm"><span className="font-semibold text-ink">{days} working day{days === 1 ? '' : 's'}</span><span className="text-ink-faint"> — sent to HR to approve</span></div>}
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !start || !end}>{saving ? 'Submitting…' : 'Submit request'}</Button></div>
      </div>
    </div>
  );
}
