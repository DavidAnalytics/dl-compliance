import { useEffect, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, EmptyState, Avatar } from '@/components/ui';
import { fullName, formatDate, workingDaysBetween, addWorkingDays } from '@/lib/compliance';
import type { Worker, Absence, BankHoliday } from '@/types/database';

const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const ORG_ID = '00000000-0000-0000-0000-0000000000d1';

export function AbsenceMonitoring() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: w }, { data: a }, { data: bh }] = await Promise.all([
      supabase.from('workers').select('*').neq('employment_status', 'left').order('last_name'),
      supabase.from('absences').select('*').order('start_date', { ascending: false }),
      supabase.from('bank_holidays').select('*'),
    ]);
    setWorkers((w as Worker[]) ?? []);
    setAbsences((a as Absence[]) ?? []);
    setHolidays(new Set(((bh as BankHoliday[]) ?? []).map((h) => h.holiday_date)));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const nameOf = (wid: string) => { const w = workers.find((x) => x.id === wid); return w ? fullName(w) : 'Unknown'; };
  const reportable = absences.filter((a) => a.reportable);

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div>
      <PageHeader title="Absence Monitoring" subtitle="Absence through the UKVI lens, with the 10 working day reporting trigger."
        actions={<Button onClick={() => setAdding(true)}><span className="inline-flex items-center gap-1.5"><Plus size={16} /> Log absence</span></Button>} />

      {reportable.length > 0 && (
        <Card className="mb-5 border-rag-red/30 bg-rag-redbg/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-rag-red"><AlertTriangle size={16} /> {reportable.length} absence{reportable.length === 1 ? '' : 's'} may be reportable to UKVI within 10 working days.</p>
        </Card>
      )}

      {absences.length === 0 ? (
        <EmptyState title="No absence recorded" hint="Log absence to monitor it against the sponsor duties." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Working days</th><th className="px-5 py-3">Authorised</th><th className="px-5 py-3">Reportable</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {absences.map((a) => (
                <tr key={a.id} className="text-ink-muted">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={nameOf(a.worker_id)} size="sm" /><span className="font-semibold text-ink">{nameOf(a.worker_id)}</span></div></td>
                  <td className="px-5 py-3 capitalize">{a.absence_type}</td>
                  <td className="px-5 py-3">{formatDate(a.start_date)} – {formatDate(a.end_date)}</td>
                  <td className="px-5 py-3">{a.working_days ?? '—'}</td>
                  <td className="px-5 py-3">{a.is_unauthorised ? <span className="text-rag-red">No</span> : 'Yes'}</td>
                  <td className="px-5 py-3">{a.reportable ? <span className="rounded-full bg-rag-redbg px-2.5 py-1 text-xs font-semibold text-rag-red">Reportable</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {adding && <LogAbsence workers={workers} holidays={holidays} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function LogAbsence({ workers, holidays, onClose, onSaved }: { workers: Worker[]; holidays: Set<string>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ worker_id: workers[0]?.id ?? '', absence_type: 'sickness', start_date: '', end_date: '', is_unauthorised: false, reason: '' });
  const [saving, setSaving] = useState(false);
  const days = f.start_date && f.end_date ? workingDaysBetween(f.start_date, f.end_date, holidays) : 0;
  const reportable = f.is_unauthorised && days > 10;

  async function save() {
    if (!f.worker_id || !f.start_date || !f.end_date) return;
    setSaving(true);
    const { data: ins } = await supabase.from('absences').insert({
      worker_id: f.worker_id, absence_type: f.absence_type, start_date: f.start_date, end_date: f.end_date,
      working_days: days, is_unauthorised: f.is_unauthorised, reportable, reason: f.reason || null,
    }).select('id').single();
    if (reportable && ins) {
      const deadline = addWorkingDays(f.end_date, 10, holidays);
      await supabase.from('reportable_events').insert({
        organisation_id: ORG_ID, worker_id: f.worker_id, event_type: 'absence_10_day',
        description: `Unauthorised absence of ${days} working days`, event_date: f.end_date, deadline, status: 'due',
      });
    }
    setSaving(false); onSaved();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">Log absence</h2>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Worker</label><select className={field} value={f.worker_id} onChange={(e) => setF({ ...f, worker_id: e.target.value })}>{workers.map((w) => <option key={w.id} value={w.id}>{fullName(w)}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Type</label><select className={field} value={f.absence_type} onChange={(e) => setF({ ...f, absence_type: e.target.value })}><option value="sickness">Sickness</option><option value="unpaid">Unpaid</option><option value="parental">Parental</option><option value="compassionate">Compassionate</option><option value="other">Other</option></select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">From</label><input type="date" className={field} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">To</label><input type="date" className={field} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted"><input type="checkbox" checked={f.is_unauthorised} onChange={(e) => setF({ ...f, is_unauthorised: e.target.checked })} /> Unauthorised (no permission)</label>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Reason</label><input className={field} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
          {f.start_date && f.end_date && (
            <div className={`rounded-xl px-4 py-2.5 text-sm ${reportable ? 'bg-rag-redbg text-rag-red' : 'bg-canvas text-ink-muted'}`}>
              {days} working days.{reportable && ' Over 10 working days and unauthorised: this will be flagged reportable and a reporting deadline set.'}
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Log absence'}</Button></div>
      </div>
    </div>
  );
}
