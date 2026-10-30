import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, SectionLabel, EmptyState } from '@/components/ui';
import { Modal, ModalActions } from '@/pages/compliance/ComplianceSettings';
import { fullName, formatDate } from '@/lib/compliance';
import type { Worker } from '@/types/database';

const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-semibold text-ink-muted';
const YEAR = new Date().getFullYear();

interface Dept { id: string; name: string; organisation_id: string }
interface LeaveType { id: string; name: string; paid: boolean; active: boolean; organisation_id: string }
interface Holiday { holiday_date: string; title: string }
interface Entitlement { id?: string; worker_id: string; year: number; entitlement_days: number; carried_over_days: number }

export function HrSettings() {
  const [orgId, setOrgId] = useState('');
  const [depts, setDepts] = useState<Dept[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [ents, setEnts] = useState<Record<string, Entitlement>>({});
  const [loading, setLoading] = useState(true);
  const [addDept, setAddDept] = useState(false);
  const [addType, setAddType] = useState(false);
  const [addHol, setAddHol] = useState(false);

  async function load() {
    const [{ data: o }, { data: d }, { data: t }, { data: h }, { data: w }, { data: e }] = await Promise.all([
      supabase.from('organisation').select('id').limit(1).maybeSingle(),
      supabase.from('departments').select('*').order('name'),
      supabase.from('leave_types').select('*').order('name'),
      supabase.from('bank_holidays').select('*').order('holiday_date'),
      supabase.from('workers').select('*').neq('employment_status', 'left').order('last_name'),
      supabase.from('leave_entitlements').select('*').eq('year', YEAR),
    ]);
    setOrgId((o as { id: string } | null)?.id ?? '');
    setDepts((d as Dept[]) ?? []);
    setTypes((t as LeaveType[]) ?? []);
    setHolidays((h as Holiday[]) ?? []);
    setWorkers((w as Worker[]) ?? []);
    const map: Record<string, Entitlement> = {};
    for (const row of (e as Entitlement[]) ?? []) map[row.worker_id] = row;
    setEnts(map);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function deleteDept(id: string) { await supabase.from('departments').delete().eq('id', id); load(); }
  async function deleteType(id: string) { await supabase.from('leave_types').delete().eq('id', id); load(); }
  async function toggleType(t: LeaveType) { await supabase.from('leave_types').update({ active: !t.active }).eq('id', t.id); load(); }
  async function deleteHoliday(date: string) { await supabase.from('bank_holidays').delete().eq('holiday_date', date); load(); }

  function setEnt(wid: string, patch: Partial<Entitlement>) {
    setEnts((m) => {
      const base: Entitlement = m[wid] ?? { worker_id: wid, year: YEAR, entitlement_days: 28, carried_over_days: 0 };
      return { ...m, [wid]: { ...base, ...patch } };
    });
  }
  async function saveEnt(wid: string) {
    const row = ents[wid] ?? { worker_id: wid, year: YEAR, entitlement_days: 28, carried_over_days: 0 };
    const payload = { worker_id: wid, year: YEAR, entitlement_days: row.entitlement_days, carried_over_days: row.carried_over_days };
    const { data: existing } = await supabase.from('leave_entitlements').select('id').eq('worker_id', wid).eq('year', YEAR).maybeSingle();
    if (existing) await supabase.from('leave_entitlements').update(payload).eq('id', (existing as { id: string }).id);
    else await supabase.from('leave_entitlements').insert(payload);
    load();
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="HR settings" subtitle="Departments, leave types, entitlements and bank holidays." />

      {/* Leave entitlements */}
      <Card className="p-6">
        <SectionLabel>Leave entitlements ({YEAR})</SectionLabel>
        {workers.length === 0 ? (
          <EmptyState title="No employees" hint="Add employees first, then set their entitlement." />
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {workers.map((w) => {
              const row = ents[w.id];
              return (
                <li key={w.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{fullName(w)}</span>
                  <label className="flex items-center gap-1.5 text-xs text-ink-faint">Days
                    <input type="number" className="w-20 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm" value={row?.entitlement_days ?? 28} onChange={(e) => setEnt(w.id, { entitlement_days: Number(e.target.value) })} />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-ink-faint">Carried
                    <input type="number" className="w-20 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm" value={row?.carried_over_days ?? 0} onChange={(e) => setEnt(w.id, { carried_over_days: Number(e.target.value) })} />
                  </label>
                  <Button size="sm" variant="secondary" onClick={() => saveEnt(w.id)}>Save</Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Departments */}
      <Card className="p-6">
        <SectionLabel action={<Button size="sm" variant="secondary" onClick={() => setAddDept(true)}><span className="inline-flex items-center gap-1.5"><Plus size={15} /> Add</span></Button>}>Departments</SectionLabel>
        {depts.length === 0 ? <EmptyState title="No departments" hint="Add a department to group employees." /> : (
          <ul className="mt-2 divide-y divide-line">
            {depts.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm font-semibold text-ink">{d.name}</span>
                <button onClick={() => deleteDept(d.id)} className="rounded-lg p-2 text-ink-faint hover:text-rag-red" aria-label="Delete"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Leave types */}
      <Card className="p-6">
        <SectionLabel action={<Button size="sm" variant="secondary" onClick={() => setAddType(true)}><span className="inline-flex items-center gap-1.5"><Plus size={15} /> Add</span></Button>}>Leave types</SectionLabel>
        {types.length === 0 ? <EmptyState title="No leave types" hint="Add the leave types your team can request." /> : (
          <ul className="mt-2 divide-y divide-line">
            {types.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm font-semibold text-ink">{t.name} <span className="ml-1 text-xs font-normal text-ink-faint">{t.paid ? 'Paid' : 'Unpaid'}</span></span>
                <button onClick={() => toggleType(t)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.active ? 'bg-rag-greenbg text-rag-green' : 'bg-canvas text-ink-faint'}`}>{t.active ? 'Active' : 'Inactive'}</button>
                <button onClick={() => deleteType(t.id)} className="rounded-lg p-2 text-ink-faint hover:text-rag-red" aria-label="Delete"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Bank holidays */}
      <Card className="p-6">
        <SectionLabel action={<Button size="sm" variant="secondary" onClick={() => setAddHol(true)}><span className="inline-flex items-center gap-1.5"><Plus size={15} /> Add</span></Button>}>Bank holidays</SectionLabel>
        {holidays.length === 0 ? <EmptyState title="No bank holidays" hint="Add bank holidays so leave working-days are calculated correctly." /> : (
          <ul className="mt-2 divide-y divide-line">
            {holidays.map((h) => (
              <li key={h.holiday_date} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm text-ink"><span className="font-semibold">{formatDate(h.holiday_date)}</span> <span className="text-ink-faint">— {h.title}</span></span>
                <button onClick={() => deleteHoliday(h.holiday_date)} className="rounded-lg p-2 text-ink-faint hover:text-rag-red" aria-label="Delete"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {addDept && <AddDept orgId={orgId} onClose={() => setAddDept(false)} onSaved={() => { setAddDept(false); load(); }} />}
      {addType && <AddType orgId={orgId} onClose={() => setAddType(false)} onSaved={() => { setAddType(false); load(); }} />}
      {addHol && <AddHoliday onClose={() => setAddHol(false)} onSaved={() => { setAddHol(false); load(); }} />}
    </div>
  );
}

function AddDept({ orgId, onClose, onSaved }: { orgId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(''); const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); await supabase.from('departments').insert({ name, organisation_id: orgId }); setSaving(false); onSaved(); }
  return <Modal title="Add department" onClose={onClose}>
    <div><label className={labelCls}>Name</label><input className={field} value={name} onChange={(e) => setName(e.target.value)} /></div>
    <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!name} />
  </Modal>;
}

function AddType({ orgId, onClose, onSaved }: { orgId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', paid: true }); const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); await supabase.from('leave_types').insert({ name: f.name, paid: f.paid, active: true, organisation_id: orgId }); setSaving(false); onSaved(); }
  return <Modal title="Add leave type" onClose={onClose}>
    <div className="space-y-3">
      <div><label className={labelCls}>Name</label><input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Annual leave, Sick, Unpaid…" /></div>
      <label className="flex items-center gap-2 text-sm text-ink-muted"><input type="checkbox" checked={f.paid} onChange={(e) => setF({ ...f, paid: e.target.checked })} /> Paid leave</label>
    </div>
    <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!f.name} />
  </Modal>;
}

function AddHoliday({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ holiday_date: '', title: '' }); const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); await supabase.from('bank_holidays').insert({ holiday_date: f.holiday_date, title: f.title }); setSaving(false); onSaved(); }
  return <Modal title="Add bank holiday" onClose={onClose}>
    <div className="space-y-3">
      <div><label className={labelCls}>Date</label><input type="date" className={field} value={f.holiday_date} onChange={(e) => setF({ ...f, holiday_date: e.target.value })} /></div>
      <div><label className={labelCls}>Title</label><input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Christmas Day" /></div>
    </div>
    <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!f.holiday_date || !f.title} />
  </Modal>;
}
