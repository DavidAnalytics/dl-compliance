import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, EmptyState, StatusPill } from '@/components/ui';
import { fullName, formatDate, daysUntil, addWorkingDays } from '@/lib/compliance';
import type { Worker, BankHoliday, RagRating } from '@/types/database';

const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const ORG_ID = '00000000-0000-0000-0000-0000000000d1';

interface Event { id: string; worker_id: string | null; event_type: string; description: string | null; event_date: string; deadline: string; status: string; reported_on: string | null; sms_reference: string | null; }

const EVENT_TYPES: { value: string; label: string; days: number }[] = [
  { value: 'salary_change', label: 'Salary change', days: 10 },
  { value: 'role_change', label: 'Job role change', days: 10 },
  { value: 'work_location_change', label: 'Work location change', days: 10 },
  { value: 'early_leaving', label: 'Worker left early', days: 10 },
  { value: 'non_attendance', label: 'Did not start', days: 10 },
  { value: 'absence_10_day', label: 'Unauthorised absence (10+ days)', days: 10 },
  { value: 'org_change', label: 'Organisation change', days: 20 },
];

export function ChangeReporting() {
  const [events, setEvents] = useState<Event[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: e }, { data: w }, { data: bh }] = await Promise.all([
      supabase.from('reportable_events').select('*').order('deadline'),
      supabase.from('workers').select('*'),
      supabase.from('bank_holidays').select('*'),
    ]);
    setEvents((e as Event[]) ?? []);
    setWorkers((w as Worker[]) ?? []);
    setHolidays(new Set(((bh as BankHoliday[]) ?? []).map((h) => h.holiday_date)));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const nameOf = (wid: string | null) => { if (!wid) return 'Organisation'; const w = workers.find((x) => x.id === wid); return w ? fullName(w) : '—'; };

  async function markReported(ev: Event) {
    const ref = prompt('SMS reference (optional):') ?? '';
    await supabase.from('reportable_events').update({ status: 'reported', reported_on: new Date().toISOString().slice(0, 10), sms_reference: ref || null }).eq('id', ev.id);
    load();
  }

  function statusOf(ev: Event): { rating: RagRating; label: string } {
    if (ev.status === 'reported') return { rating: 'green', label: 'Reported' };
    if (ev.status === 'not_required') return { rating: 'green', label: 'Not required' };
    const d = daysUntil(ev.deadline);
    if (d !== null && d < 0) return { rating: 'red', label: 'Overdue' };
    if (d !== null && d <= 3) return { rating: 'amber', label: `Due in ${d}d` };
    return { rating: 'amber', label: `Due ${formatDate(ev.deadline)}` };
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div>
      <PageHeader title="Change Reporting" subtitle="Reportable events and their SMS deadlines (10 or 20 working days)."
        actions={<Button onClick={() => setAdding(true)}><span className="inline-flex items-center gap-1.5"><Plus size={16} /> Log event</span></Button>} />

      {events.length === 0 ? (
        <EmptyState title="No reportable events" hint="Log a change here and the deadline is calculated for you." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Event</th><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Occurred</th><th className="px-5 py-3">Deadline</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((ev) => {
                const s = statusOf(ev);
                return (
                  <tr key={ev.id} className="text-ink-muted">
                    <td className="px-5 py-3"><span className="font-semibold capitalize text-ink">{ev.event_type.replace(/_/g, ' ')}</span>{ev.description && <p className="text-xs text-ink-faint">{ev.description}</p>}</td>
                    <td className="px-5 py-3">{nameOf(ev.worker_id)}</td>
                    <td className="px-5 py-3">{formatDate(ev.event_date)}</td>
                    <td className="px-5 py-3">{formatDate(ev.deadline)}</td>
                    <td className="px-5 py-3"><StatusPill rating={s.rating} label={s.label} /></td>
                    <td className="px-5 py-3 text-right">{ev.status === 'due' && <Button size="sm" variant="secondary" onClick={() => markReported(ev)}>Mark reported</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {adding && <LogEvent workers={workers} holidays={holidays} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function LogEvent({ workers, holidays, onClose, onSaved }: { workers: Worker[]; holidays: Set<string>; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ event_type: 'salary_change', worker_id: '', description: '', event_date: today });
  const [saving, setSaving] = useState(false);
  const def = EVENT_TYPES.find((t) => t.value === f.event_type)!;
  const deadline = f.event_date ? addWorkingDays(f.event_date, def.days, holidays) : '';

  async function save() {
    setSaving(true);
    await supabase.from('reportable_events').insert({
      organisation_id: ORG_ID, worker_id: f.worker_id || null, event_type: f.event_type,
      description: f.description || null, event_date: f.event_date, deadline, status: 'due',
    });
    setSaving(false); onSaved();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">Log reportable event</h2>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Event</label><select className={field} value={f.event_type} onChange={(e) => setF({ ...f, event_type: e.target.value })}>{EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label} ({t.days} days)</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Worker</label><select className={field} value={f.worker_id} onChange={(e) => setF({ ...f, worker_id: e.target.value })}><option value="">Organisation-level</option>{workers.map((w) => <option key={w.id} value={w.id}>{fullName(w)}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Date it occurred</label><input type="date" className={field} value={f.event_date} onChange={(e) => setF({ ...f, event_date: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Description</label><input className={field} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          {deadline && <div className="rounded-xl bg-canvas px-4 py-2.5 text-sm"><span className="font-semibold text-ink">Report by {formatDate(deadline)}</span> <span className="text-ink-faint">({def.days} working days)</span></div>}
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Log event'}</Button></div>
      </div>
    </div>
  );
}
