import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, SectionLabel, EmptyState } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/compliance';

const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-semibold text-ink-muted';

interface Org {
  id: string; legal_name: string | null; company_number: string | null; sponsor_licence_no: string | null;
  licence_rating: string | null; licence_route: string | null; licence_expiry: string | null;
  registered_address: string | null; default_soc_code: string | null;
}
interface KeyPerson {
  id: string; organisation_id: string; full_name: string; sms_role: string;
  email: string | null; phone: string | null; appointed_on: string | null; last_sms_login: string | null;
}
interface GoingRate {
  id: string; soc_code: string; occupation: string | null; going_rate_annual: number | null;
  hourly_rate: number | null; effective_from: string | null;
}

const SMS_ROLES = [
  { value: 'authorising_officer', label: 'Authorising Officer' },
  { value: 'key_contact', label: 'Key Contact' },
  { value: 'level_1_user', label: 'Level 1 User' },
  { value: 'level_2_user', label: 'Level 2 User' },
];
const smsLabel = (v: string) => SMS_ROLES.find((r) => r.value === v)?.label ?? v;

export function ComplianceSettings() {
  const [org, setOrg] = useState<Org | null>(null);
  const [people, setPeople] = useState<KeyPerson[]>([]);
  const [rates, setRates] = useState<GoingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState(false);
  const [editPerson, setEditPerson] = useState<Partial<KeyPerson> | null>(null);
  const [editRate, setEditRate] = useState<Partial<GoingRate> | null>(null);

  async function load() {
    const [{ data: o }, { data: kp }, { data: gr }] = await Promise.all([
      supabase.from('organisation').select('*').limit(1).maybeSingle(),
      supabase.from('key_personnel').select('*').order('sms_role'),
      supabase.from('soc_going_rates').select('*').order('soc_code'),
    ]);
    setOrg((o as Org) ?? null);
    setPeople((kp as KeyPerson[]) ?? []);
    setRates((gr as GoingRate[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveOrg(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    const { id, ...rest } = org;
    await supabase.from('organisation').update(rest).eq('id', id);
    setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2500);
  }
  function setOrgField<K extends keyof Org>(k: K, v: Org[K]) { setOrg((o) => (o ? { ...o, [k]: v } : o)); }

  async function deletePerson(id: string) { await supabase.from('key_personnel').delete().eq('id', id); load(); }
  async function deleteRate(id: string) { await supabase.from('soc_going_rates').delete().eq('id', id); load(); }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Compliance settings" subtitle="Organisation, licence, key personnel and going rates. These feed the readiness score." />

      {/* Organisation & licence */}
      <Card className="p-6">
        <SectionLabel>Organisation &amp; licence</SectionLabel>
        {org ? (
          <form onSubmit={saveOrg} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Legal name</label><input className={field} value={org.legal_name ?? ''} onChange={(e) => setOrgField('legal_name', e.target.value)} /></div>
            <div><label className={labelCls}>Company number</label><input className={field} value={org.company_number ?? ''} onChange={(e) => setOrgField('company_number', e.target.value)} /></div>
            <div><label className={labelCls}>Sponsor licence number</label><input className={field} value={org.sponsor_licence_no ?? ''} onChange={(e) => setOrgField('sponsor_licence_no', e.target.value)} /></div>
            <div><label className={labelCls}>Licence rating</label><input className={field} value={org.licence_rating ?? ''} onChange={(e) => setOrgField('licence_rating', e.target.value)} placeholder="A-rating" /></div>
            <div><label className={labelCls}>Licence route</label><input className={field} value={org.licence_route ?? ''} onChange={(e) => setOrgField('licence_route', e.target.value)} placeholder="Skilled Worker" /></div>
            <div><label className={labelCls}>Licence expiry</label><input type="date" className={field} value={org.licence_expiry ?? ''} onChange={(e) => setOrgField('licence_expiry', e.target.value || null)} /></div>
            <div><label className={labelCls}>Default SOC code</label><input className={field} value={org.default_soc_code ?? ''} onChange={(e) => setOrgField('default_soc_code', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Registered address</label><input className={field} value={org.registered_address ?? ''} onChange={(e) => setOrgField('registered_address', e.target.value)} /></div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit">Save organisation</Button>
              {savedMsg && <span className="text-sm font-semibold text-rag-green">Saved.</span>}
            </div>
          </form>
        ) : <p className="mt-2 text-sm text-ink-muted">No organisation record found.</p>}
      </Card>

      {/* Key personnel */}
      <Card className="p-6">
        <SectionLabel action={<Button size="sm" variant="secondary" onClick={() => setEditPerson({})}><span className="inline-flex items-center gap-1.5"><Plus size={15} /> Add</span></Button>}>
          Key personnel (SMS)
        </SectionLabel>
        {people.length === 0 ? (
          <EmptyState title="No key personnel" hint="Add your Authorising Officer, Key Contact and Level 1 User." />
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{p.full_name}</p>
                  <p className="text-xs text-ink-faint">{smsLabel(p.sms_role)}{p.email ? ` · ${p.email}` : ''}{p.last_sms_login ? ` · last SMS login ${formatDate(p.last_sms_login)}` : ''}</p>
                </div>
                <button onClick={() => setEditPerson(p)} className="rounded-lg p-2 text-ink-faint hover:text-brand-600" aria-label="Edit"><Pencil size={16} /></button>
                <button onClick={() => deletePerson(p.id)} className="rounded-lg p-2 text-ink-faint hover:text-rag-red" aria-label="Delete"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Going rates */}
      <Card className="p-6">
        <SectionLabel action={<Button size="sm" variant="secondary" onClick={() => setEditRate({})}><span className="inline-flex items-center gap-1.5"><Plus size={15} /> Add</span></Button>}>
          SOC going rates
        </SectionLabel>
        {rates.length === 0 ? (
          <EmptyState title="No going rates" hint="Add the going rate for each SOC code you sponsor under." />
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {rates.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.soc_code} {r.occupation ? <span className="font-normal text-ink-muted">— {r.occupation}</span> : null}</p>
                  <p className="text-xs text-ink-faint">{r.going_rate_annual != null ? `${formatMoney(r.going_rate_annual)}/yr` : '—'}{r.hourly_rate != null ? ` · ${formatMoney(r.hourly_rate)}/hr` : ''}{r.effective_from ? ` · from ${formatDate(r.effective_from)}` : ''}</p>
                </div>
                <button onClick={() => setEditRate(r)} className="rounded-lg p-2 text-ink-faint hover:text-brand-600" aria-label="Edit"><Pencil size={16} /></button>
                <button onClick={() => deleteRate(r.id)} className="rounded-lg p-2 text-ink-faint hover:text-rag-red" aria-label="Delete"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editPerson && <PersonModal person={editPerson} orgId={org?.id ?? ''} onClose={() => setEditPerson(null)} onSaved={() => { setEditPerson(null); load(); }} />}
      {editRate && <RateModal rate={editRate} onClose={() => setEditRate(null)} onSaved={() => { setEditRate(null); load(); }} />}
    </div>
  );
}

function PersonModal({ person, orgId, onClose, onSaved }: { person: Partial<KeyPerson>; orgId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<KeyPerson>>({ sms_role: 'authorising_officer', ...person });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const payload = { organisation_id: orgId, full_name: f.full_name, sms_role: f.sms_role, email: f.email || null, phone: f.phone || null, appointed_on: f.appointed_on || null, last_sms_login: f.last_sms_login || null };
    if (person.id) await supabase.from('key_personnel').update(payload).eq('id', person.id);
    else await supabase.from('key_personnel').insert(payload);
    setSaving(false); onSaved();
  }
  return (
    <Modal title={person.id ? 'Edit key person' : 'Add key person'} onClose={onClose}>
      <div className="space-y-3">
        <div><label className={labelCls}>Full name</label><input className={field} value={f.full_name ?? ''} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div><label className={labelCls}>SMS role</label><select className={field} value={f.sms_role} onChange={(e) => setF({ ...f, sms_role: e.target.value })}>{SMS_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
        <div><label className={labelCls}>Email</label><input type="email" className={field} value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className={labelCls}>Phone</label><input className={field} value={f.phone ?? ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Appointed on</label><input type="date" className={field} value={f.appointed_on ?? ''} onChange={(e) => setF({ ...f, appointed_on: e.target.value })} /></div>
          <div><label className={labelCls}>Last SMS login</label><input type="date" className={field} value={f.last_sms_login ?? ''} onChange={(e) => setF({ ...f, last_sms_login: e.target.value })} /></div>
        </div>
      </div>
      <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!f.full_name} />
    </Modal>
  );
}

function RateModal({ rate, onClose, onSaved }: { rate: Partial<GoingRate>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<GoingRate>>({ ...rate });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const payload = { soc_code: f.soc_code, occupation: f.occupation || null, going_rate_annual: f.going_rate_annual ?? null, hourly_rate: f.hourly_rate ?? null, effective_from: f.effective_from || null };
    if (rate.id) await supabase.from('soc_going_rates').update(payload).eq('id', rate.id);
    else await supabase.from('soc_going_rates').insert(payload);
    setSaving(false); onSaved();
  }
  return (
    <Modal title={rate.id ? 'Edit going rate' : 'Add going rate'} onClose={onClose}>
      <div className="space-y-3">
        <div><label className={labelCls}>SOC code</label><input className={field} value={f.soc_code ?? ''} onChange={(e) => setF({ ...f, soc_code: e.target.value })} /></div>
        <div><label className={labelCls}>Occupation</label><input className={field} value={f.occupation ?? ''} onChange={(e) => setF({ ...f, occupation: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Going rate (£/yr)</label><input type="number" className={field} value={f.going_rate_annual ?? ''} onChange={(e) => setF({ ...f, going_rate_annual: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><label className={labelCls}>Hourly rate (£)</label><input type="number" step="0.01" className={field} value={f.hourly_rate ?? ''} onChange={(e) => setF({ ...f, hourly_rate: e.target.value ? Number(e.target.value) : null })} /></div>
        </div>
        <div><label className={labelCls}>Effective from</label><input type="date" className={field} value={f.effective_from ?? ''} onChange={(e) => setF({ ...f, effective_from: e.target.value })} /></div>
      </div>
      <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!f.soc_code} />
    </Modal>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}
export function ModalActions({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={onSave} disabled={saving || disabled}>{saving ? 'Saving…' : 'Save'}</Button>
    </div>
  );
}
