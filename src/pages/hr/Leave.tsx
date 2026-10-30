import { useEffect, useMemo, useState } from 'react';
import { Plus, Check, X, ChevronLeft, ChevronRight, AlertTriangle, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, Card, Button, Avatar, EmptyState } from '@/components/ui';
import { fullName, formatDate, workingDaysBetween, rangesOverlap } from '@/lib/compliance';
import { downloadCSV } from '@/lib/export';
import type { Worker, LeaveType, LeaveRequest, LeaveEntitlement, BankHoliday } from '@/types/database';

type View = 'requests' | 'calendar' | 'entitlements';
const YEAR = new Date().getFullYear();

const statusStyle: Record<string, string> = {
  pending: 'bg-rag-amberbg text-rag-amber',
  approved: 'bg-rag-greenbg text-rag-green',
  rejected: 'bg-rag-redbg text-rag-red',
  cancelled: 'bg-canvas text-ink-faint',
};

function absenceTypeFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('sick')) return 'sickness';
  if (n.includes('unpaid')) return 'unpaid';
  if (n.includes('parental')) return 'parental';
  if (n.includes('compassion')) return 'compassionate';
  if (n.includes('annual') || n.includes('holiday')) return 'holiday';
  return 'other';
}

export function Leave() {
  const { session } = useAuth();
  const [view, setView] = useState<View>('requests');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  async function load() {
    const [w, t, r, e, bh] = await Promise.all([
      supabase.from('workers').select('*').neq('employment_status', 'left').order('last_name'),
      supabase.from('leave_types').select('*').eq('active', true).order('name'),
      supabase.from('leave_requests').select('*').order('start_date', { ascending: false }),
      supabase.from('leave_entitlements').select('*').eq('year', YEAR),
      supabase.from('bank_holidays').select('*'),
    ]);
    setWorkers((w.data as Worker[]) ?? []);
    setTypes((t.data as LeaveType[]) ?? []);
    setRequests((r.data as LeaveRequest[]) ?? []);
    setEntitlements((e.data as LeaveEntitlement[]) ?? []);
    setHolidays(new Set(((bh.data as BankHoliday[]) ?? []).map((h) => h.holiday_date)));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const nameOf = (wid: string) => { const w = workers.find((x) => x.id === wid); return w ? fullName(w) : 'Unknown'; };
  const typeOf = (tid: string | null) => types.find((x) => x.id === tid);

  // taken (approved annual-leave working days this year) per worker
  const takenByWorker = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of requests) {
      if (r.status !== 'approved') continue;
      const t = typeOf(r.leave_type_id);
      if (t && absenceTypeFor(t.name) === 'holiday' && r.start_date.slice(0, 4) === String(YEAR)) {
        map[r.worker_id] = (map[r.worker_id] ?? 0) + (r.working_days ?? 0);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, types]);

  async function decide(req: LeaveRequest, status: 'approved' | 'rejected') {
    await supabase.from('leave_requests').update({
      status, decided_by: session?.user.id ?? null, decided_at: new Date().toISOString(),
    }).eq('id', req.id);
    if (status === 'approved') {
      const t = typeOf(req.leave_type_id);
      await supabase.from('absences').insert({
        worker_id: req.worker_id, absence_type: absenceTypeFor(t?.name ?? 'other'),
        start_date: req.start_date, end_date: req.end_date, working_days: req.working_days,
        reason: req.reason, leave_request_id: req.id,
      });
    }
    load();
  }
  async function cancel(req: LeaveRequest) {
    await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', req.id);
    if (req.status === 'approved') await supabase.from('absences').delete().eq('leave_request_id', req.id);
    load();
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');

  function exportCsv() {
    downloadCSV(`leave-requests-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Employee', 'Type', 'From', 'To', 'Working days', 'Status', 'Reason', 'Decided at'],
      requests.map((r) => [nameOf(r.worker_id), typeOf(r.leave_type_id)?.name ?? '', r.start_date, r.end_date, r.working_days, r.status, r.reason, r.decided_at ? new Date(r.decided_at).toLocaleString('en-GB') : '']));
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div>
      <PageHeader title="Leave & Holiday" subtitle="Requests, approvals, entitlements and the team calendar."
        actions={<div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={requests.length === 0}><span className="inline-flex items-center gap-1.5"><FileDown size={16} /> Export CSV</span></Button>
          <Button onClick={() => setBooking(true)}><span className="inline-flex items-center gap-1.5"><Plus size={16} /> Book leave</span></Button>
        </div>} />

      <div className="mb-5 flex gap-1 border-b border-line">
        {(['requests', 'calendar', 'entitlements'] as View[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`relative px-3.5 py-2.5 text-sm font-semibold capitalize transition ${view === v ? 'text-brand-600' : 'text-ink-faint hover:text-ink'}`}>
            {v}
            {view === v && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
          </button>
        ))}
      </div>

      {view === 'requests' && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-base font-bold text-ink">Pending approval {pending.length > 0 && <span className="ml-1 rounded-full bg-rag-amberbg px-2 py-0.5 text-xs text-rag-amber">{pending.length}</span>}</h2>
            {pending.length === 0 ? (
              <Card className="px-6 py-8 text-center text-sm text-ink-muted">No requests waiting.</Card>
            ) : (
              <div className="space-y-2">
                {pending.map((r) => (
                  <Card key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                    <Avatar name={nameOf(r.worker_id)} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink">{nameOf(r.worker_id)} · <span className="font-normal text-ink-muted">{typeOf(r.leave_type_id)?.name ?? 'Leave'}</span></p>
                      <p className="text-xs text-ink-faint">{formatDate(r.start_date)} – {formatDate(r.end_date)} · {r.working_days ?? 0} days{r.reason ? ` · ${r.reason}` : ''}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => decide(r, 'rejected')}><span className="inline-flex items-center gap-1 text-rag-red"><X size={14} /> Reject</span></Button>
                      <Button size="sm" onClick={() => decide(r, 'approved')}><span className="inline-flex items-center gap-1"><Check size={14} /> Approve</span></Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-base font-bold text-ink">All requests</h2>
            {decided.length === 0 ? (
              <Card className="px-6 py-8 text-center text-sm text-ink-muted">Nothing yet.</Card>
            ) : (
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
                    <tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Days</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {decided.map((r) => (
                      <tr key={r.id} className="text-ink-muted">
                        <td className="px-5 py-3 font-medium text-ink">{nameOf(r.worker_id)}</td>
                        <td className="px-5 py-3">{typeOf(r.leave_type_id)?.name ?? '—'}</td>
                        <td className="px-5 py-3">{formatDate(r.start_date)} – {formatDate(r.end_date)}</td>
                        <td className="px-5 py-3">{r.working_days ?? '—'}</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[r.status]}`}>{r.status}</span></td>
                        <td className="px-5 py-3 text-right">{r.status === 'approved' && <button onClick={() => cancel(r)} className="text-xs font-semibold text-ink-faint hover:text-rag-red">Cancel</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </div>
      )}

      {view === 'calendar' && <TeamCalendar requests={requests.filter((r) => r.status === 'approved')} nameOf={nameOf} typeOf={typeOf} />}

      {view === 'entitlements' && (
        <Entitlements workers={workers} entitlements={entitlements} takenByWorker={takenByWorker} onSaved={load} />
      )}

      {booking && (
        <BookLeave workers={workers} types={types} requests={requests} holidays={holidays}
          onClose={() => setBooking(false)} onBooked={() => { setBooking(false); load(); setView('requests'); }} />
      )}
    </div>
  );
}

// --- Book leave modal -------------------------------------------------------
function BookLeave({ workers, types, requests, holidays, onClose, onBooked }: {
  workers: Worker[]; types: LeaveType[]; requests: LeaveRequest[]; holidays: Set<string>;
  onClose: () => void; onBooked: () => void;
}) {
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? '');
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const days = start && end ? workingDaysBetween(start, end, holidays) : 0;

  // overlap: same worker, approved/pending, overlapping range
  const selfOverlap = start && end && requests.some((r) =>
    r.worker_id === workerId && (r.status === 'approved' || r.status === 'pending') && rangesOverlap(start, end, r.start_date, r.end_date));
  // others off in the same window (info)
  const othersOff = start && end ? requests.filter((r) =>
    r.worker_id !== workerId && r.status === 'approved' && rangesOverlap(start, end, r.start_date, r.end_date))
    .map((r) => workers.find((w) => w.id === r.worker_id)).filter(Boolean) as Worker[] : [];

  const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';

  async function submit() {
    if (!workerId || !typeId || !start || !end || selfOverlap) return;
    setSaving(true);
    await supabase.from('leave_requests').insert({
      worker_id: workerId, leave_type_id: typeId, start_date: start, end_date: end,
      working_days: days, reason: reason || null, status: 'pending',
    });
    setSaving(false);
    onBooked();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">Book leave</h2>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Employee</label>
            <select className={field} value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              {workers.map((w) => <option key={w.id} value={w.id}>{fullName(w)}</option>)}
            </select></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Leave type</label>
            <select className={field} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">From</label><input type="date" className={field} value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">To</label><input type="date" className={field} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Reason (optional)</label><input className={field} value={reason} onChange={(e) => setReason(e.target.value)} /></div>

          {start && end && (
            <div className="rounded-xl bg-canvas px-4 py-3 text-sm">
              <span className="font-semibold text-ink">{days} working day{days === 1 ? '' : 's'}</span>
              <span className="text-ink-faint"> (weekends and bank holidays excluded)</span>
            </div>
          )}
          {selfOverlap && (
            <p className="flex items-center gap-2 text-sm text-rag-red"><AlertTriangle size={16} /> This overlaps existing leave for the same person.</p>
          )}
          {othersOff.length > 0 && (
            <p className="flex items-center gap-2 text-sm text-rag-amber"><AlertTriangle size={16} /> Also off then: {othersOff.map((w) => fullName(w)).join(', ')}.</p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !start || !end || !!selfOverlap}>{saving ? 'Submitting…' : 'Submit request'}</Button>
        </div>
      </div>
    </div>
  );
}

// --- Team calendar ----------------------------------------------------------
function TeamCalendar({ requests, nameOf, typeOf }: {
  requests: LeaveRequest[]; nameOf: (id: string) => string; typeOf: (id: string | null) => LeaveType | undefined;
}) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  // map date -> entries
  const byDate: Record<string, { name: string; colour: string }[]> = {};
  for (const r of requests) {
    const t = typeOf(r.leave_type_id);
    const d = new Date(r.start_date); const e = new Date(r.end_date);
    while (d <= e) {
      const iso = d.toISOString().slice(0, 10);
      (byDate[iso] ??= []).push({ name: nameOf(r.worker_id), colour: t?.colour ?? '#635BE5' });
      d.setDate(d.getDate() + 1);
    }
  }

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">{monthLabel}</h2>
        <div className="flex gap-1">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-lg border border-line p-1.5 hover:bg-canvas"><ChevronLeft size={16} /></button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-lg border border-line p-1.5 hover:bg-canvas"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-2xs font-bold uppercase text-ink-faint">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const iso = new Date(year, month, day).toISOString().slice(0, 10);
          const entries = byDate[iso] ?? [];
          return (
            <div key={i} className="min-h-[64px] rounded-lg border border-line p-1.5">
              <p className="text-xs font-semibold text-ink-muted">{day}</p>
              <div className="mt-1 space-y-0.5">
                {entries.slice(0, 3).map((e, j) => (
                  <div key={j} className="truncate rounded px-1 py-0.5 text-2xs font-medium text-white" style={{ background: e.colour }}>{e.name.split(' ')[0]}</div>
                ))}
                {entries.length > 3 && <p className="text-2xs text-ink-faint">+{entries.length - 3}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// --- Entitlements -----------------------------------------------------------
function Entitlements({ workers, entitlements, takenByWorker, onSaved }: {
  workers: Worker[]; entitlements: LeaveEntitlement[]; takenByWorker: Record<string, number>; onSaved: () => void;
}) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const entOf = (wid: string) => entitlements.find((e) => e.worker_id === wid);

  async function save(wid: string) {
    const val = Number(edits[wid]);
    if (Number.isNaN(val)) return;
    const existing = entOf(wid);
    if (existing) await supabase.from('leave_entitlements').update({ entitlement_days: val }).eq('id', existing.id);
    else await supabase.from('leave_entitlements').insert({ worker_id: wid, year: YEAR, entitlement_days: val });
    setEdits((e) => { const n = { ...e }; delete n[wid]; return n; });
    onSaved();
  }

  if (workers.length === 0) return <EmptyState title="No employees yet" hint="Add employees to set their leave entitlements." />;

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
          <tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Entitlement ({YEAR})</th><th className="px-5 py-3">Taken</th><th className="px-5 py-3">Remaining</th><th className="px-5 py-3"></th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {workers.map((w) => {
            const ent = entOf(w.id);
            const entDays = ent ? ent.entitlement_days + ent.carried_over_days : 28;
            const taken = takenByWorker[w.id] ?? 0;
            const editing = edits[w.id] !== undefined;
            return (
              <tr key={w.id} className="text-ink-muted">
                <td className="px-5 py-3 font-medium text-ink">{fullName(w)}</td>
                <td className="px-5 py-3">
                  {editing
                    ? <input className="w-20 rounded-lg border border-line px-2 py-1 text-sm" value={edits[w.id]} onChange={(e) => setEdits({ ...edits, [w.id]: e.target.value })} />
                    : <button onClick={() => setEdits({ ...edits, [w.id]: String(ent?.entitlement_days ?? 28) })} className="font-semibold text-ink hover:text-brand-600">{entDays}</button>}
                </td>
                <td className="px-5 py-3">{taken}</td>
                <td className="px-5 py-3 font-semibold text-ink">{Math.max(entDays - taken, 0)}</td>
                <td className="px-5 py-3 text-right">{editing && <Button size="sm" onClick={() => save(w.id)}>Save</Button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
