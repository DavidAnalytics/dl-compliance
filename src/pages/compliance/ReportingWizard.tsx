import { useState } from 'react';
import { ArrowLeft, Check, Megaphone, FileDown, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { fullName, formatDate, addWorkingDays } from '@/lib/compliance';
import { printHTML, field as pf, table as pt } from '@/lib/export';
import type { Worker } from '@/types/database';

const ORG_ID = '00000000-0000-0000-0000-0000000000d1';

type Cat = 'worker' | 'sponsorship' | 'organisation';

interface Evt {
  key: string; cat: Cat; event_type: string; label: string; days: number; orgLevel?: boolean;
  checklist: string[]; draft: (name: string, date: string) => string;
}

const CATEGORIES: { value: Cat; title: string; hint: string }[] = [
  { value: 'worker', title: 'Something changed for a worker', hint: 'They did not start, left, or their job, pay or location changed.' },
  { value: 'sponsorship', title: 'Sponsorship changed', hint: 'You stopped sponsoring the worker, or they moved to another sponsor.' },
  { value: 'organisation', title: 'The organisation changed', hint: 'A change to your company: name, address, ownership or structure.' },
];

const EVENTS: Evt[] = [
  { key: 'non_attendance', cat: 'worker', event_type: 'non_attendance', label: 'Worker did not start work', days: 10,
    checklist: ['The worker’s full name and CoS number', 'The expected start date and confirmation they did not attend', 'Any contact you have made with the worker', 'Report within 10 working days of the expected start date'],
    draft: (n, d) => `${n} did not start work on the expected start date of ${d}. We have attempted to make contact and confirm they have not attended.` },
  { key: 'absence_10_day', cat: 'worker', event_type: 'absence_10_day', label: 'Unauthorised absence of 10+ days', days: 10,
    checklist: ['Worker name and CoS number', 'The first day of absence and that it is unauthorised', 'Steps taken to contact the worker', 'Whether you intend to continue sponsorship', 'Report within 10 working days of the 10th day of absence'],
    draft: (n, d) => `${n} has been absent from work without permission for more than 10 consecutive working days, with the first day of absence on ${d}. We have attempted to make contact.` },
  { key: 'early_leaving', cat: 'worker', event_type: 'early_leaving', label: 'Employment ended early (resignation, dismissal or contract end)', days: 10,
    checklist: ['Worker name and CoS number', 'The last day of employment and the reason', 'Whether notice was given', 'Report within 10 working days'],
    draft: (n, d) => `${n}’s employment ended on ${d}. The reason for leaving and whether notice was given are recorded.` },
  { key: 'role_change', cat: 'worker', event_type: 'role_change', label: 'Job, duties or SOC code changed', days: 10,
    checklist: ['Worker name and CoS number', 'Previous and new job title, duties and SOC code', 'Effective date of the change', 'Confirmation the role still meets the eligibility and salary rules', 'Report within 10 working days'],
    draft: (n, d) => `${n}’s job role changed with effect from ${d}. The previous and new job title, duties and SOC code are recorded, and the role continues to meet the eligibility and salary requirements.` },
  { key: 'salary_change', cat: 'worker', event_type: 'salary_change', label: 'Salary changed', days: 10,
    checklist: ['Worker name and CoS number', 'Previous and new salary', 'Reason and effective date', 'Confirmation the new salary still meets the going rate and minimum thresholds', 'Report within 10 working days'],
    draft: (n, d) => `${n}’s salary changed with effect from ${d}. The previous and new salary are recorded, and the revised salary continues to meet the going rate and minimum thresholds.` },
  { key: 'work_location_change', cat: 'worker', event_type: 'work_location_change', label: 'Work location changed', days: 10,
    checklist: ['Worker name and CoS number', 'Previous and new work address', 'Effective date', 'Report within 10 working days'],
    draft: (n, d) => `${n}’s regular work location changed with effect from ${d}. The previous and new work address are recorded.` },
  { key: 'stop_sponsoring', cat: 'sponsorship', event_type: 'early_leaving', label: 'You have stopped sponsoring the worker', days: 10,
    checklist: ['Worker name and CoS number', 'The date sponsorship stopped and the reason', 'Report within 10 working days'],
    draft: (n, d) => `We have stopped sponsoring ${n} with effect from ${d}. The reason is recorded.` },
  { key: 'tupe_transfer', cat: 'sponsorship', event_type: 'tupe_transfer', label: 'Worker moved to another sponsor (e.g. TUPE)', days: 10,
    checklist: ['Worker name and CoS number', 'Details of the new employer or sponsor', 'Date of transfer', 'Report within 10 working days'],
    draft: (n, d) => `${n} transferred to another sponsor with effect from ${d}. Details of the new employer are recorded.` },
  { key: 'org_change', cat: 'organisation', event_type: 'org_change', label: 'Change to the organisation (name, address, ownership, structure)', days: 20, orgLevel: true,
    checklist: ['The nature of the change (name, address, ownership, structure or insolvency)', 'The effective date', 'Any change to key personnel on the licence', 'Report within 20 working days'],
    draft: (_n, d) => `A change to the organisation took effect on ${d}. The nature of the change and any effect on key personnel are recorded.` },
];

export function ReportingWizard({ workers, holidays, onClose, onSaved }: { workers: Worker[]; holidays: Set<string>; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState<Cat | ''>('');
  const [evtKey, setEvtKey] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [eventDate, setEventDate] = useState(today);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [savedDeadline, setSavedDeadline] = useState('');

  const evt = EVENTS.find((e) => e.key === evtKey) ?? null;
  const worker = workers.find((w) => w.id === workerId) ?? null;
  const deadline = evt && eventDate ? addWorkingDays(eventDate, evt.days, holidays) : '';

  function pickEvent(key: string) {
    setEvtKey(key);
    const e = EVENTS.find((x) => x.key === key)!;
    const name = e.orgLevel ? 'The organisation' : (worker ? fullName(worker) : 'The worker');
    setDescription(e.draft(name, formatDate(eventDate) || eventDate));
    setStep(3);
  }

  // refresh the draft name when the worker or date changes on step 3
  function refreshDraft(nextWorkerId?: string, nextDate?: string) {
    if (!evt) return;
    const w = workers.find((x) => x.id === (nextWorkerId ?? workerId)) ?? null;
    const name = evt.orgLevel ? 'The organisation' : (w ? fullName(w) : 'The worker');
    setDescription(evt.draft(name, formatDate(nextDate ?? eventDate) || (nextDate ?? eventDate)));
  }

  async function save() {
    if (!evt) return;
    setSaving(true);
    const { error } = await supabase.from('reportable_events').insert({
      organisation_id: ORG_ID, worker_id: evt.orgLevel ? null : (workerId || null),
      event_type: evt.event_type, description: description || null,
      event_date: eventDate, deadline, status: 'due',
    });
    setSaving(false);
    if (!error) { setSavedDeadline(deadline); setDone(true); }
  }

  function printReport() {
    if (!evt) return;
    const name = evt.orgLevel ? 'Organisation' : (worker ? fullName(worker) : '—');
    printHTML(`Reportable event — ${evt.label}`, `
      <h1>Reportable Event Report</h1>
      <p class="meta">${evt.label} · generated ${new Date().toLocaleString('en-GB')}</p>
      <div class="grid">
        ${pf('Subject', name)}${pf('Event', evt.label)}${pf('Date it occurred', formatDate(eventDate))}
        ${pf('Reporting deadline', formatDate(deadline))}${pf('Working days allowed', evt.days)}${pf('Status', 'To report via SMS')}
      </div>
      <h2>Report details</h2>
      <p>${description || '—'}</p>
      <h2>What to include when reporting via SMS</h2>
      ${pt(['Checklist'], evt.checklist.map((c) => [c]))}`);
  }

  const needsWorker = evt && !evt.orgLevel;

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-ink/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Megaphone size={18} /></div>
            <div>
              <h2 className="text-base font-bold text-ink">Reporting Duties Wizard</h2>
              <p className="text-xs text-ink-faint">Step {Math.min(step, 3)} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>

        {/* Step 1: category */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">What happened?</p>
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => { setCat(c.value); setStep(2); }}
                  className={`block w-full rounded-xl border p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 ${cat === c.value ? 'border-brand-400 bg-brand-50/60' : 'border-line'}`}>
                  <p className="text-sm font-semibold text-ink">{c.title}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">{c.hint}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: specific event */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">Which of these describes it?</p>
            <div className="space-y-2">
              {EVENTS.filter((e) => e.cat === cat).map((e) => (
                <button key={e.key} onClick={() => pickEvent(e.key)}
                  className="flex w-full items-center justify-between rounded-xl border border-line p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40">
                  <span className="text-sm font-semibold text-ink">{e.label}</span>
                  <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-2xs font-semibold text-ink-faint">{e.days} days</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}><span className="inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Back</span></Button>
            </div>
          </div>
        )}

        {/* Step 3: details */}
        {step === 3 && evt && !done && (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <p className="text-2xs font-bold uppercase tracking-wide text-brand-600">Reportable event</p>
              <p className="mt-0.5 text-sm font-bold text-ink">{evt.label}</p>
              <ul className="mt-2 space-y-1">
                {evt.checklist.map((c, i) => <li key={i} className="flex gap-2 text-xs text-ink-muted"><Check size={13} className="mt-0.5 shrink-0 text-brand-500" /> {c}</li>)}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {needsWorker && (
                <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Worker</label>
                  <select className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" value={workerId} onChange={(e) => { setWorkerId(e.target.value); refreshDraft(e.target.value); }}>
                    <option value="">Select…</option>
                    {workers.map((w) => <option key={w.id} value={w.id}>{fullName(w)}</option>)}
                  </select></div>
              )}
              <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Date it occurred</label><input type="date" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" value={eventDate} onChange={(e) => { setEventDate(e.target.value); refreshDraft(undefined, e.target.value); }} /></div>
            </div>

            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Report details (editable draft)</label>
              <textarea rows={3} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></div>

            {deadline && (
              <div className="rounded-xl bg-canvas px-4 py-2.5 text-sm"><span className="font-semibold text-ink">Report via SMS by {formatDate(deadline)}</span> <span className="text-ink-faint">({evt.days} working days, weekends and bank holidays excluded)</span></div>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}><span className="inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Back</span></Button>
              <Button onClick={save} disabled={saving || (needsWorker && !workerId) || !eventDate}>{saving ? 'Logging…' : 'Log reportable event'}</Button>
            </div>
          </div>
        )}

        {/* Done */}
        {done && evt && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rag-greenbg text-rag-green"><Check size={24} /></div>
            <div>
              <p className="text-base font-bold text-ink">Event logged</p>
              <p className="mt-1 text-sm text-ink-muted">Report via SMS by {formatDate(savedDeadline)}. It is now tracked, with alerts as the deadline approaches.</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={printReport}><span className="inline-flex items-center gap-1.5"><FileDown size={15} /> Print report</span></Button>
              <Button onClick={onSaved}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
