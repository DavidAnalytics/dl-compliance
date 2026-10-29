import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, StatusPill, Avatar } from '@/components/ui';
import { fullName, formatDate, daysUntil } from '@/lib/compliance';
import type { Worker, RightToWorkCheck, RagRating } from '@/types/database';

const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const SHARE_CODE = /^W[A-Za-z0-9]{8}$/;

export function RightToWork() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [checks, setChecks] = useState<RightToWorkCheck[]>([]);
  const [recordFor, setRecordFor] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: w }, { data: c }] = await Promise.all([
      supabase.from('workers').select('*').neq('employment_status', 'left').order('last_name'),
      supabase.from('right_to_work_checks').select('*').order('checked_on', { ascending: false }),
    ]);
    setWorkers((w as Worker[]) ?? []);
    setChecks((c as RightToWorkCheck[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const latestFor = (wid: string) => checks.find((c) => c.worker_id === wid);

  function ragFor(w: Worker, c?: RightToWorkCheck): { rating: RagRating; label: string } {
    if (w.sponsorship_type !== 'sponsored') return { rating: 'green', label: 'Not required' };
    if (!c) return { rating: 'red', label: 'No check on file' };
    if (c.outcome === 'fail') return { rating: 'red', label: 'Check failed' };
    const due = daysUntil(c.excuse_expiry ?? c.follow_up_due ?? null);
    if (due !== null && due < 0) return { rating: 'red', label: 'Follow-up overdue' };
    if (due !== null && due <= 90) return { rating: 'amber', label: `Follow-up in ${due}d` };
    return { rating: 'green', label: 'Valid' };
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div>
      <PageHeader title="Right to Work & eVisa" subtitle="Online share code checks, statutory excuse and follow-up scheduling." />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
            <tr><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Last check</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Excuse</th><th className="px-5 py-3">Follow-up</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {workers.map((w) => {
              const c = latestFor(w.id);
              const r = ragFor(w, c);
              return (
                <tr key={w.id} className="text-ink-muted">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3"><Avatar name={fullName(w)} size="sm" /><span className="font-semibold text-ink">{fullName(w)}</span></div>
                  </td>
                  <td className="px-5 py-3">{c ? formatDate(c.checked_on) : '—'}</td>
                  <td className="px-5 py-3">{c ? c.method.replace(/_/g, ' ') : '—'}</td>
                  <td className="px-5 py-3 capitalize">{c ? c.excuse_type.replace(/_/g, ' ') : '—'}</td>
                  <td className="px-5 py-3">{c ? formatDate(c.excuse_expiry ?? c.follow_up_due) : '—'}</td>
                  <td className="px-5 py-3"><StatusPill rating={r.rating} label={r.label} /></td>
                  <td className="px-5 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setRecordFor(w)}>Record check</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {recordFor && <RecordCheck worker={recordFor} onClose={() => setRecordFor(null)} onSaved={() => { setRecordFor(null); load(); }} />}
    </div>
  );
}

function RecordCheck({ worker, onClose, onSaved }: { worker: Worker; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    method: 'online_share_code', share_code: '', checked_on: today, checked_by: '',
    outcome: 'pass_continuous', excuse_type: 'continuous', excuse_expiry: '',
  });
  const [saving, setSaving] = useState(false);

  const codeInvalid = f.method === 'online_share_code' && f.share_code !== '' && !SHARE_CODE.test(f.share_code);
  // time-limited excuses need an expiry
  const needsExpiry = f.excuse_type !== 'continuous';

  async function save() {
    if (codeInvalid) return;
    setSaving(true);
    await supabase.from('right_to_work_checks').insert({
      worker_id: worker.id, method: f.method, share_code: f.share_code || null,
      checked_on: f.checked_on, checked_by: f.checked_by || null, outcome: f.outcome,
      excuse_type: f.excuse_type, excuse_expiry: needsExpiry ? (f.excuse_expiry || null) : null,
      follow_up_due: needsExpiry ? (f.excuse_expiry || null) : null,
    });
    setSaving(false); onSaved();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold text-ink">Record right to work check</h2>
        <p className="mb-4 text-sm text-ink-muted">{fullName(worker)}</p>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Method</label>
            <select className={field} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
              <option value="online_share_code">Online share code</option><option value="manual_document">Manual document</option><option value="idvt">IDVT (certified IDSP)</option>
            </select></div>
          {f.method === 'online_share_code' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Share code</label>
              <input className={field} placeholder="W then 8 characters" value={f.share_code} onChange={(e) => setF({ ...f, share_code: e.target.value.toUpperCase() })} />
              {codeInvalid && <p className="mt-1 flex items-center gap-1.5 text-xs text-rag-red"><AlertTriangle size={14} /> Share codes are 9 characters beginning with W.</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Checked on</label><input type="date" className={field} value={f.checked_on} onChange={(e) => setF({ ...f, checked_on: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Checked by</label><input className={field} value={f.checked_by} onChange={(e) => setF({ ...f, checked_by: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Outcome</label>
              <select className={field} value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}>
                <option value="pass_continuous">Pass (continuous)</option><option value="pass_time_limited">Pass (time limited)</option><option value="fail">Fail</option><option value="pending">Pending</option>
              </select></div>
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Statutory excuse</label>
              <select className={field} value={f.excuse_type} onChange={(e) => setF({ ...f, excuse_type: e.target.value })}>
                <option value="continuous">Continuous (List A)</option><option value="time_limited">Time limited (List B1)</option><option value="six_month">Six month (List B2)</option><option value="none">None</option>
              </select></div>
          </div>
          {needsExpiry && (
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Excuse expires / follow-up due</label><input type="date" className={field} value={f.excuse_expiry} onChange={(e) => setF({ ...f, excuse_expiry: e.target.value })} /></div>
          )}
          <p className="rounded-xl bg-canvas px-4 py-2.5 text-2xs text-ink-faint">Keep a copy of the check evidence in Documents. For a continuous excuse no follow-up is needed; time-limited and six-month excuses are scheduled from the expiry date.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || codeInvalid}>{saving ? 'Saving…' : 'Record check'}</Button>
        </div>
      </div>
    </div>
  );
}
