import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, StatusPill, Code, SectionLabel } from '@/components/ui';
import { fullName, formatMoney, formatDate } from '@/lib/compliance';
import type { Worker, SocGoingRate, PayPeriod, RagRating } from '@/types/database';

const field = 'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-brand-300 focus:outline-none';

export function Employment() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rates, setRates] = useState<SocGoingRate[]>([]);
  const [open, setOpen] = useState<Worker | null>(null);
  const [addingRate, setAddingRate] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: w }, { data: r }] = await Promise.all([
      supabase.from('workers').select('*').eq('sponsorship_type', 'sponsored').neq('employment_status', 'left').order('last_name'),
      supabase.from('soc_going_rates').select('*').order('soc_code'),
    ]);
    setWorkers((w as Worker[]) ?? []);
    setRates((r as SocGoingRate[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const rateFor = (soc: string | null) => rates.find((r) => r.soc_code === soc);
  function salaryRag(w: Worker): { rating: RagRating; label: string } {
    const r = rateFor(w.soc_code);
    if (!r?.going_rate_annual || w.annual_salary === null) return { rating: 'amber', label: 'No rate set' };
    if (w.annual_salary >= r.going_rate_annual) return { rating: 'green', label: 'At or above rate' };
    return { rating: 'red', label: 'Below going rate' };
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Employment & CoS" subtitle="Salary alignment against going rates, per-period pay and role eligibility." />

      <div>
        <SectionLabel action={<Button size="sm" variant="secondary" onClick={() => setAddingRate(true)}><span className="inline-flex items-center gap-1.5"><Plus size={14} /> Add rate</span></Button>}>Going rates</SectionLabel>
        {rates.length === 0 ? (
          <Card className="px-5 py-6 text-sm text-ink-muted">No going rates yet. Add them from the current gov.uk Skilled Worker going rates so salaries can be checked.</Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint"><tr><th className="px-5 py-3">SOC</th><th className="px-5 py-3">Occupation</th><th className="px-5 py-3">Going rate</th></tr></thead>
              <tbody className="divide-y divide-line">
                {rates.map((r) => <tr key={r.id} className="text-ink-muted"><td className="px-5 py-3"><Code>{r.soc_code}</Code></td><td className="px-5 py-3 text-ink">{r.occupation}</td><td className="px-5 py-3">{formatMoney(r.going_rate_annual)}</td></tr>)}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <div>
        <SectionLabel>Salary alignment</SectionLabel>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint"><tr><th className="px-5 py-3">Worker</th><th className="px-5 py-3">SOC</th><th className="px-5 py-3">Salary</th><th className="px-5 py-3">Going rate</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
            <tbody className="divide-y divide-line">
              {workers.map((w) => {
                const r = rateFor(w.soc_code); const rag = salaryRag(w);
                return (
                  <tr key={w.id} className="text-ink-muted">
                    <td className="px-5 py-3 font-semibold text-ink">{fullName(w)}</td>
                    <td className="px-5 py-3">{w.soc_code ? <Code>{w.soc_code}</Code> : '—'}</td>
                    <td className="px-5 py-3">{formatMoney(w.annual_salary)}</td>
                    <td className="px-5 py-3">{formatMoney(r?.going_rate_annual ?? null)}</td>
                    <td className="px-5 py-3"><StatusPill rating={rag.rating} label={rag.label} /></td>
                    <td className="px-5 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setOpen(w)}>Pay & review</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {addingRate && <AddRate onClose={() => setAddingRate(false)} onSaved={() => { setAddingRate(false); load(); }} />}
      {open && <WorkerPanel worker={open} goingRate={rateFor(open.soc_code)?.going_rate_annual ?? null} onClose={() => setOpen(null)} />}
    </div>
  );
}

function AddRate({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ soc_code: '', occupation: '', going_rate_annual: '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.soc_code.trim()) return;
    setSaving(true);
    await supabase.from('soc_going_rates').upsert({ soc_code: f.soc_code, occupation: f.occupation || f.soc_code, going_rate_annual: f.going_rate_annual ? Number(f.going_rate_annual) : null, source_note: 'Entered from gov.uk going rates' }, { onConflict: 'soc_code' });
    setSaving(false); onSaved();
  }
  return (
    <Modal title="Add going rate" onClose={onClose} onSave={save} saving={saving}>
      <div><label className="mb-1 block text-xs font-semibold text-ink-muted">SOC code</label><input className={field} value={f.soc_code} onChange={(e) => setF({ ...f, soc_code: e.target.value })} /></div>
      <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Occupation</label><input className={field} value={f.occupation} onChange={(e) => setF({ ...f, occupation: e.target.value })} /></div>
      <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Going rate (£/year)</label><input type="number" className={field} value={f.going_rate_annual} onChange={(e) => setF({ ...f, going_rate_annual: e.target.value })} /></div>
      <p className="text-2xs text-ink-faint">Use the current figure from the gov.uk Skilled Worker going rates for this SOC code.</p>
    </Modal>
  );
}

function WorkerPanel({ worker, goingRate, onClose }: { worker: Worker; goingRate: number | null; onClose: () => void }) {
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [reviews, setReviews] = useState<{ id: string; reviewed_on: string; still_eligible: boolean | null; notes: string | null }[]>([]);
  const [pay, setPay] = useState({ period_start: '', period_end: '', gross_paid: '', hours: '' });
  const [review, setReview] = useState({ still_eligible: 'yes', notes: '' });

  async function load() {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('pay_periods').select('*').eq('worker_id', worker.id).order('period_end', { ascending: false }),
      supabase.from('role_eligibility_reviews').select('id,reviewed_on,still_eligible,notes').eq('worker_id', worker.id).order('reviewed_on', { ascending: false }),
    ]);
    setPeriods((p as PayPeriod[]) ?? []);
    setReviews((r as typeof reviews) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [worker.id]);

  async function addPay() {
    if (!pay.period_start || !pay.period_end) return;
    const gross = pay.gross_paid ? Number(pay.gross_paid) : null;
    // rough monthly going-rate check
    const monthlyRate = goingRate ? goingRate / 12 : null;
    const meets = gross !== null && monthlyRate !== null ? gross >= monthlyRate : null;
    await supabase.from('pay_periods').insert({
      worker_id: worker.id, period_start: pay.period_start, period_end: pay.period_end,
      gross_paid: gross, hours: pay.hours ? Number(pay.hours) : null, meets_going_rate: meets,
      shortfall: meets === false && monthlyRate !== null && gross !== null ? monthlyRate - gross : null,
    });
    setPay({ period_start: '', period_end: '', gross_paid: '', hours: '' });
    load();
  }
  async function addReview() {
    await supabase.from('role_eligibility_reviews').insert({ worker_id: worker.id, still_eligible: review.still_eligible === 'yes', notes: review.notes || null });
    setReview({ still_eligible: 'yes', notes: '' });
    load();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-surface p-6 shadow-pop thin-scroll" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold text-ink">{fullName(worker)}</h2>
        <p className="mb-5 text-sm text-ink-muted">Pay periods source from FreeAgent. Going rate: {formatMoney(goingRate)}.</p>

        <p className="mb-2 text-sm font-bold text-ink">Record a pay period</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input type="date" className={field} value={pay.period_start} onChange={(e) => setPay({ ...pay, period_start: e.target.value })} />
          <input type="date" className={field} value={pay.period_end} onChange={(e) => setPay({ ...pay, period_end: e.target.value })} />
          <input className={field} placeholder="Gross £" value={pay.gross_paid} onChange={(e) => setPay({ ...pay, gross_paid: e.target.value })} />
          <input className={field} placeholder="Hours" value={pay.hours} onChange={(e) => setPay({ ...pay, hours: e.target.value })} />
        </div>
        <div className="mt-2"><Button size="sm" onClick={addPay}>Add period</Button></div>
        {periods.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm"><tbody className="divide-y divide-line">
              {periods.map((p) => (
                <tr key={p.id} className="text-ink-muted"><td className="px-3 py-2">{formatDate(p.period_start)} – {formatDate(p.period_end)}</td><td className="px-3 py-2">{formatMoney(p.gross_paid)}</td><td className="px-3 py-2">{p.meets_going_rate === null ? '—' : p.meets_going_rate ? <span className="text-rag-green">meets rate</span> : <span className="text-rag-red">below rate</span>}</td></tr>
              ))}
            </tbody></table>
          </div>
        )}

        <p className="mb-2 mt-6 text-sm font-bold text-ink">Role eligibility review</p>
        <div className="flex gap-2">
          <select className={field} value={review.still_eligible} onChange={(e) => setReview({ ...review, still_eligible: e.target.value })}><option value="yes">Still eligible</option><option value="no">No longer eligible</option></select>
          <input className={field} placeholder="Notes" value={review.notes} onChange={(e) => setReview({ ...review, notes: e.target.value })} />
          <Button size="sm" onClick={addReview}>Log</Button>
        </div>
        {reviews.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-ink-muted">
            {reviews.map((r) => <li key={r.id}>{formatDate(r.reviewed_on)} · {r.still_eligible ? 'eligible' : 'not eligible'}{r.notes ? ` · ${r.notes}` : ''}</li>)}
          </ul>
        )}

        <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, onSave, saving }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
        <div className="space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>
      </div>
    </div>
  );
}
