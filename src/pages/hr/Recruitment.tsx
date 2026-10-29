import { useEffect, useMemo, useState } from 'react';
import { Plus, ArrowLeft, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, EmptyState, Avatar } from '@/components/ui';
import { fullName } from '@/lib/compliance';
import type { Vacancy, Candidate, Department, Worker } from '@/types/database';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const;
const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const ORG_ID = '00000000-0000-0000-0000-0000000000d1';

export function Recruitment() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Vacancy | null>(null);
  const [newVac, setNewVac] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [v, d, w, c] = await Promise.all([
      supabase.from('vacancies').select('*').order('created_at', { ascending: false }),
      supabase.from('departments').select('*'),
      supabase.from('workers').select('*').neq('employment_status', 'left'),
      supabase.from('candidates').select('vacancy_id'),
    ]);
    setVacancies((v.data as Vacancy[]) ?? []);
    setDepartments((d.data as Department[]) ?? []);
    setWorkers((w.data as Worker[]) ?? []);
    const cc: Record<string, number> = {};
    for (const row of (c.data as { vacancy_id: string }[]) ?? []) cc[row.vacancy_id] = (cc[row.vacancy_id] ?? 0) + 1;
    setCounts(cc);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const deptName = (id: string | null) => departments.find((x) => x.id === id)?.name ?? '—';

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (selected) return <VacancyDetail vacancy={selected} departments={departments} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div>
      <PageHeader title="Recruitment" subtitle="Vacancies and the candidate pipeline."
        actions={<Button onClick={() => setNewVac(true)}><span className="inline-flex items-center gap-1.5"><Plus size={16} /> New vacancy</span></Button>} />

      {vacancies.length === 0 ? (
        <EmptyState title="No vacancies yet" hint="Create a vacancy to start tracking candidates." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vacancies.map((v) => (
            <Card key={v.id} className="cursor-pointer p-5 transition hover:shadow-pop" onClick={() => setSelected(v)}>
              <div className="flex items-start justify-between">
                <h3 className="text-base font-bold text-ink">{v.title}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${v.status === 'open' ? 'bg-rag-greenbg text-rag-green' : 'bg-canvas text-ink-faint'}`}>{v.status}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{deptName(v.department_id)} · {v.openings} opening{v.openings === 1 ? '' : 's'}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600"><Users size={15} /> {counts[v.id] ?? 0} candidates</p>
            </Card>
          ))}
        </div>
      )}

      {newVac && <NewVacancy departments={departments} workers={workers} onClose={() => setNewVac(false)} onSaved={() => { setNewVac(false); load(); }} />}
    </div>
  );

  function NewVacancy({ departments, workers, onClose, onSaved }: { departments: Department[]; workers: Worker[]; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState<{ title: string; department_id: string; hiring_manager_id: string; openings: number; description: string }>({ title: '', department_id: '', hiring_manager_id: '', openings: 1, description: '' });
    const [saving, setSaving] = useState(false);
    async function save() {
      if (!f.title.trim()) return;
      setSaving(true);
      await supabase.from('vacancies').insert({ organisation_id: ORG_ID, title: f.title, department_id: f.department_id || null, hiring_manager_id: f.hiring_manager_id || null, openings: f.openings, description: f.description || null });
      setSaving(false); onSaved();
    }
    return (
      <Modal title="New vacancy" onClose={onClose} onSave={save} saving={saving}>
        <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Title</label><input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Department</label>
            <select className={field} value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })}><option value="">Not set</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Openings</label><input type="number" className={field} value={f.openings} onChange={(e) => setF({ ...f, openings: Number(e.target.value) })} /></div>
        </div>
        <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Hiring manager</label>
          <select className={field} value={f.hiring_manager_id} onChange={(e) => setF({ ...f, hiring_manager_id: e.target.value })}><option value="">Not set</option>{workers.map((w) => <option key={w.id} value={w.id}>{fullName(w)}</option>)}</select></div>
        <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Description</label><textarea className={field} rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </Modal>
    );
  }
}

function VacancyDetail({ vacancy, departments, onBack }: { vacancy: Vacancy; departments: Department[]; onBack: () => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('candidates').select('*').eq('vacancy_id', vacancy.id).order('created_at');
    setCandidates((data as Candidate[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [vacancy.id]);

  async function move(c: Candidate, stage: string) { await supabase.from('candidates').update({ stage }).eq('id', c.id); load(); }
  async function saveCard(id: string, patch: Partial<Candidate>) { await supabase.from('candidates').update(patch).eq('id', id); load(); }

  const deptName = departments.find((x) => x.id === vacancy.department_id)?.name ?? '—';
  const byStage = useMemo(() => {
    const m: Record<string, Candidate[]> = {};
    for (const c of candidates) (m[c.stage] ??= []).push(c);
    return m;
  }, [candidates]);
  const rejected = byStage['rejected'] ?? [];

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"><ArrowLeft size={16} /> Vacancies</button>
      <PageHeader title={vacancy.title} subtitle={`${deptName} · ${vacancy.openings} opening${vacancy.openings === 1 ? '' : 's'} · ${vacancy.status}`}
        actions={<Button onClick={() => setAdding(true)}><span className="inline-flex items-center gap-1.5"><Plus size={16} /> Add candidate</span></Button>} />

      {loading ? <p className="text-sm text-ink-muted">Loading…</p> : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {STAGES.map((s) => (
            <div key={s} className="rounded-xl bg-canvas/60 p-2">
              <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-faint">{s} · {(byStage[s] ?? []).length}</p>
              <div className="space-y-2">
                {(byStage[s] ?? []).map((c) => <CandidateCard key={c.id} c={c} onMove={move} onSave={saveCard} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Rejected</p>
          <div className="flex flex-wrap gap-2">
            {rejected.map((c) => <span key={c.id} className="rounded-full bg-canvas px-3 py-1 text-xs text-ink-muted">{c.name}</span>)}
          </div>
        </div>
      )}

      {adding && <AddCandidate vacancyId={vacancy.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function CandidateCard({ c, onMove, onSave }: { c: Candidate; onMove: (c: Candidate, s: string) => void; onSave: (id: string, p: Partial<Candidate>) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(c.notes ?? '');
  const [feedback, setFeedback] = useState(c.feedback ?? '');
  const [offer, setOffer] = useState({ offer_salary: c.offer_salary ?? '', offer_start_date: c.offer_start_date ?? '', offer_status: c.offer_status ?? '' });
  return (
    <div className="rounded-lg border border-line bg-surface p-2.5 shadow-card">
      <div className="flex items-center gap-2">
        <Avatar name={c.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
          <p className="truncate text-2xs text-ink-faint">{c.email ?? '—'}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <select value={c.stage} onChange={(e) => onMove(c, e.target.value)} className="flex-1 rounded-md border border-line bg-white px-1.5 py-1 text-2xs">
          {[...STAGES, 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setOpen((o) => !o)} className="rounded-md px-1.5 py-1 text-2xs font-semibold text-brand-600 hover:bg-brand-50">{open ? 'Less' : 'More'}</button>
      </div>
      {open && (
        <div className="mt-2 space-y-2 border-t border-line pt-2">
          {c.cv_url && <a href={c.cv_url} target="_blank" rel="noreferrer" className="block text-2xs font-semibold text-brand-600 hover:underline">View CV</a>}
          <textarea placeholder="Interview notes" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => onSave(c.id, { notes })} className="w-full rounded-md border border-line px-2 py-1 text-2xs" rows={2} />
          <textarea placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} onBlur={() => onSave(c.id, { feedback })} className="w-full rounded-md border border-line px-2 py-1 text-2xs" rows={2} />
          {c.stage === 'offer' && (
            <div className="space-y-1.5">
              <input placeholder="Offer salary" value={offer.offer_salary} onChange={(e) => setOffer({ ...offer, offer_salary: e.target.value })} className="w-full rounded-md border border-line px-2 py-1 text-2xs" />
              <input type="date" value={offer.offer_start_date} onChange={(e) => setOffer({ ...offer, offer_start_date: e.target.value })} className="w-full rounded-md border border-line px-2 py-1 text-2xs" />
              <select value={offer.offer_status} onChange={(e) => setOffer({ ...offer, offer_status: e.target.value })} className="w-full rounded-md border border-line px-2 py-1 text-2xs"><option value="">Offer status</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select>
              <button onClick={() => onSave(c.id, { offer_salary: offer.offer_salary ? Number(offer.offer_salary) : null, offer_start_date: offer.offer_start_date || null, offer_status: offer.offer_status || null })} className="w-full rounded-md bg-brand-500 py-1 text-2xs font-semibold text-white">Save offer</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddCandidate({ vacancyId, onClose, onSaved }: { vacancyId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', cv_url: '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    await supabase.from('candidates').insert({ vacancy_id: vacancyId, name: f.name, email: f.email || null, phone: f.phone || null, cv_url: f.cv_url || null, stage: 'applied' });
    setSaving(false); onSaved();
  }
  return (
    <Modal title="Add candidate" onClose={onClose} onSave={save} saving={saving}>
      <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Name</label><input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Email</label><input className={field} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Phone</label><input className={field} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      </div>
      <div><label className="mb-1 block text-xs font-semibold text-ink-muted">CV link</label><input className={field} placeholder="https://…" value={f.cv_url} onChange={(e) => setF({ ...f, cv_url: e.target.value })} /></div>
    </Modal>
  );
}

function Modal({ title, children, onClose, onSave, saving }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
        <div className="space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
    </div>
  );
}
