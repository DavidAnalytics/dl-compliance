import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, FileDown, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { fullName, formatDate } from '@/lib/compliance';
import { printHTML, field as pf, table as pt } from '@/lib/export';
import type { Worker } from '@/types/database';

type Category = 'british_irish' | 'euss_settled' | 'euss_presettled' | 'visa_holder' | 'pending_application' | 'frontier_worker' | 'unsure';
type FollowUp = 'none' | 'status_expiry' | 'six_months';

interface Route {
  method: 'online_share_code' | 'manual_document' | 'idvt' | 'employer_checking_service';
  excuse_type: 'continuous' | 'time_limited' | 'six_month' | 'none';
  outcome: 'pass_continuous' | 'pass_time_limited' | 'fail' | 'pending';
  followUp: FollowUp;
  needsShareCode: boolean;
  methodLabel: string;
  docs: string[];
  note: string;
}

const CATEGORIES: { value: Category; title: string; hint: string }[] = [
  { value: 'british_irish', title: 'British or Irish citizen', hint: 'Holds a British or Irish passport, or can prove citizenship.' },
  { value: 'euss_settled', title: 'EU/EEA/Swiss — settled status', hint: 'Granted settled status under the EU Settlement Scheme.' },
  { value: 'euss_presettled', title: 'EU/EEA/Swiss — pre-settled status', hint: 'Granted pre-settled status (time-limited) under the EUSS.' },
  { value: 'visa_holder', title: 'Visa holder (eVisa or BRP)', hint: 'Skilled Worker or other visa, with an eVisa, share code or BRP.' },
  { value: 'pending_application', title: 'Application or appeal pending', hint: 'An outstanding in-time application, appeal or administrative review, with no acceptable documents.' },
  { value: 'frontier_worker', title: 'Frontier worker', hint: 'Holds a Frontier Worker permit.' },
  { value: 'unsure', title: 'Not sure', hint: 'You do not yet know the person’s immigration status.' },
];

function routeFor(c: Category): Route {
  switch (c) {
    case 'british_irish':
      return { method: 'manual_document', excuse_type: 'continuous', outcome: 'pass_continuous', followUp: 'none', needsShareCode: false, methodLabel: 'Manual document check (List A)',
        docs: ['A valid passport showing the holder is a British or Irish citizen, or', 'A birth or adoption certificate issued in the UK, Channel Islands, Isle of Man or Ireland, together with an official document showing the holder’s National Insurance number', 'Alternatively verify a valid British or Irish passport through a certified IDSP (IDVT)'],
        note: 'A British or Irish citizen gives a continuous statutory excuse. No follow-up is required.' };
    case 'euss_settled':
      return { method: 'online_share_code', excuse_type: 'continuous', outcome: 'pass_continuous', followUp: 'none', needsShareCode: true, methodLabel: 'Online check (share code)',
        docs: ['Carry out an online right to work check using the individual’s share code and date of birth', 'Confirm the photograph matches the individual', 'Settled status gives an indefinite right to work'],
        note: 'Settled status gives a continuous statutory excuse. No follow-up is required.' };
    case 'euss_presettled':
      return { method: 'online_share_code', excuse_type: 'time_limited', outcome: 'pass_time_limited', followUp: 'status_expiry', needsShareCode: true, methodLabel: 'Online check (share code)',
        docs: ['Carry out an online right to work check using the share code and date of birth', 'Pre-settled status is time-limited', 'Record the expiry date so a follow-up check is scheduled'],
        note: 'Pre-settled status is time-limited. A follow-up check is due when it expires.' };
    case 'visa_holder':
      return { method: 'online_share_code', excuse_type: 'time_limited', outcome: 'pass_time_limited', followUp: 'status_expiry', needsShareCode: true, methodLabel: 'Online check (share code)',
        docs: ['Carry out an online right to work check using the share code and date of birth', 'Confirm the visa conditions permit the work on offer', 'Record the visa expiry so a follow-up check is scheduled'],
        note: 'A visa holder gives a time-limited statutory excuse. A follow-up check is due at expiry.' };
    case 'pending_application':
      return { method: 'employer_checking_service', excuse_type: 'six_month', outcome: 'pass_time_limited', followUp: 'six_months', needsShareCode: false, methodLabel: 'Employer Checking Service',
        docs: ['Request a Positive Verification Notice from the Home Office Employer Checking Service', 'Use this route when the person has an outstanding in-time application, appeal or administrative review and cannot show acceptable documents', 'A Positive Verification Notice gives a six-month statutory excuse'],
        note: 'The Employer Checking Service gives a six-month statutory excuse. A follow-up check is due in six months.' };
    case 'frontier_worker':
      return { method: 'online_share_code', excuse_type: 'time_limited', outcome: 'pass_time_limited', followUp: 'status_expiry', needsShareCode: true, methodLabel: 'Online check (share code)',
        docs: ['Carry out an online right to work check using the Frontier Worker permit share code', 'Record the permit expiry so a follow-up check is scheduled'],
        note: 'A Frontier Worker permit is time-limited. A follow-up check is due at expiry.' };
    default:
      return { method: 'manual_document', excuse_type: 'none', outcome: 'pending', followUp: 'none', needsShareCode: false, methodLabel: 'Status not yet established',
        docs: ['Establish the person’s immigration status before carrying out a check', 'Ask for their passport, eVisa share code or Biometric Residence Permit', 'If they have an outstanding application, use the Employer Checking Service'],
        note: 'You cannot establish a statutory excuse until the person’s status is known.' };
  }
}

const SHARE_CODE = /^W[A-Za-z0-9]{8}$/;
const addMonths = (iso: string, n: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };

export function RtwWizard({ workers, initialWorker, onClose, onSaved }: { workers: Worker[]; initialWorker?: Worker | null; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(initialWorker ? 2 : 1);
  const [workerId, setWorkerId] = useState(initialWorker?.id ?? '');
  const [category, setCategory] = useState<Category | ''>('');
  const [checkedOn, setCheckedOn] = useState(today);
  const [checkedBy, setCheckedBy] = useState(profile?.full_name ?? '');
  const [shareCode, setShareCode] = useState('');
  const [expiry, setExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const worker = workers.find((w) => w.id === workerId) ?? null;
  const route = category ? routeFor(category) : null;
  const followUpDate = route?.followUp === 'six_months' ? addMonths(checkedOn, 6) : route?.followUp === 'status_expiry' ? (expiry || null) : null;
  const codeInvalid = !!route?.needsShareCode && shareCode !== '' && !SHARE_CODE.test(shareCode);

  function pickCategory(c: Category) {
    setCategory(c);
    // default the expiry from the worker's visa date where relevant
    if ((c === 'visa_holder' || c === 'euss_presettled' || c === 'frontier_worker') && worker?.visa_expiry) setExpiry(worker.visa_expiry);
    setStep(3);
  }

  async function save() {
    if (!worker || !route || codeInvalid) return;
    setSaving(true);
    const { error } = await supabase.from('right_to_work_checks').insert({
      worker_id: worker.id, method: route.method, share_code: route.needsShareCode ? (shareCode || null) : null,
      checked_on: checkedOn, checked_by: checkedBy || null, outcome: route.outcome,
      excuse_type: route.excuse_type, excuse_expiry: followUpDate, follow_up_due: followUpDate,
      notes: `Guided check — ${CATEGORIES.find((x) => x.value === category)?.title}`,
    });
    setSaving(false);
    if (!error) setDone(true);
  }

  function printCertificate() {
    if (!worker || !route) return;
    const cat = CATEGORIES.find((x) => x.value === category)?.title ?? '';
    printHTML(`${fullName(worker)} — right to work check`, `
      <h1>Right to Work Check Record</h1>
      <p class="meta">${fullName(worker)} · generated ${new Date().toLocaleString('en-GB')}</p>
      <div class="grid">
        ${pf('Nationality', worker.nationality)}${pf('Immigration status', cat)}${pf('Check method', route.methodLabel)}
        ${pf('Checked on', formatDate(checkedOn))}${pf('Checked by', checkedBy)}${pf('Share code', route.needsShareCode ? shareCode : null)}
        ${pf('Statutory excuse', route.excuse_type.replace(/_/g, ' '))}${pf('Follow-up due', followUpDate ? formatDate(followUpDate) : 'Not required')}${pf('Outcome', route.outcome.replace(/_/g, ' '))}
      </div>
      <h2>Basis of check</h2>
      ${pt(['Step followed'], route.docs.map((d) => [d]))}
      <p class="meta" style="margin-top:14px">${route.note}</p>`);
  }

  const canRecord = category !== 'unsure';

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-ink/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><ShieldCheck size={18} /></div>
            <div>
              <h2 className="text-base font-bold text-ink">Right to Work Check Wizard</h2>
              <p className="text-xs text-ink-faint">Step {Math.min(step, 3)} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>

        {/* Step 1: worker */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">Who is this check for?</p>
            <select className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm" value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              <option value="">Select a worker…</option>
              {workers.map((w) => <option key={w.id} value={w.id}>{fullName(w)}{w.nationality ? ` — ${w.nationality}` : ''}</option>)}
            </select>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!workerId}><span className="inline-flex items-center gap-1.5">Continue <ArrowRight size={15} /></span></Button>
            </div>
          </div>
        )}

        {/* Step 2: status */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">What is {worker ? fullName(worker).split(' ')[0] : 'the individual'}’s status?</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => pickCategory(c.value)}
                  className={`rounded-xl border p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 ${category === c.value ? 'border-brand-400 bg-brand-50/60' : 'border-line'}`}>
                  <p className="text-sm font-semibold text-ink">{c.title}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">{c.hint}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}><span className="inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Back</span></Button>
            </div>
          </div>
        )}

        {/* Step 3: route + record */}
        {step === 3 && route && !done && (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <p className="text-2xs font-bold uppercase tracking-wide text-brand-600">Required check</p>
              <p className="mt-0.5 text-sm font-bold text-ink">{route.methodLabel}</p>
              <ul className="mt-2 space-y-1">
                {route.docs.map((d, i) => <li key={i} className="flex gap-2 text-xs text-ink-muted"><Check size={13} className="mt-0.5 shrink-0 text-brand-500" /> {d}</li>)}
              </ul>
              <p className="mt-2 text-xs font-medium text-ink">{route.note}</p>
            </div>

            {canRecord ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Checked on</label><input type="date" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" value={checkedOn} onChange={(e) => setCheckedOn(e.target.value)} /></div>
                  <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Checked by</label><input className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} /></div>
                </div>
                {route.needsShareCode && (
                  <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Share code</label>
                    <input className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" placeholder="W then 8 characters" value={shareCode} onChange={(e) => setShareCode(e.target.value.toUpperCase())} />
                    {codeInvalid && <p className="mt-1 text-xs text-rag-red">Share codes are 9 characters beginning with W.</p>}
                  </div>
                )}
                {route.followUp === 'status_expiry' && (
                  <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Status / visa expiry (sets the follow-up date)</label><input type="date" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
                )}
                <div className="rounded-xl bg-canvas px-4 py-2.5 text-xs text-ink-muted">
                  Follow-up: <span className="font-semibold text-ink">{followUpDate ? formatDate(followUpDate) : 'not required'}</span>. A follow-up date is added to the alerts engine automatically. Keep the check evidence in Documents.
                </div>
              </div>
            ) : (
              <p className="rounded-xl bg-rag-amberbg px-4 py-3 text-sm text-rag-amber">Establish the person’s status first, then run the check. Nothing is recorded until you do.</p>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}><span className="inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Back</span></Button>
              {canRecord && <Button onClick={save} disabled={saving || codeInvalid || (route.followUp === 'status_expiry' && !expiry)}>{saving ? 'Recording…' : 'Record check'}</Button>}
            </div>
          </div>
        )}

        {/* Done */}
        {done && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rag-greenbg text-rag-green"><Check size={24} /></div>
            <div>
              <p className="text-base font-bold text-ink">Check recorded</p>
              <p className="mt-1 text-sm text-ink-muted">{worker ? fullName(worker) : ''}{followUpDate ? ` · follow-up due ${formatDate(followUpDate)}` : ' · no follow-up required'}</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={printCertificate}><span className="inline-flex items-center gap-1.5"><FileDown size={15} /> Print record</span></Button>
              <Button onClick={onSaved}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
