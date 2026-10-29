import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageHeader, Button, Card } from '@/components/ui';
import { fullName } from '@/lib/compliance';
import type { Worker, EmploymentStatus, SponsorshipType, Department } from '@/types/database';

type AppVariant = 'compliance' | 'hr';
const ORG_ID = '00000000-0000-0000-0000-0000000000d1';
const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-semibold text-ink-muted';

export function WorkerForm({ app }: { app: AppVariant }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const base = app === 'hr' ? '/hr/employees' : '/compliance/workers';
  const editing = Boolean(id);
  const [form, setForm] = useState<Partial<Worker>>({ sponsorship_type: 'sponsored', employment_status: 'onboarding', requires_dbs: false });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Worker[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: deps }, { data: mgrs }] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('workers').select('*').neq('employment_status', 'left'),
      ]);
      setDepartments((deps as Department[]) ?? []);
      setManagers((mgrs as Worker[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const { data } = await supabase.from('workers').select('*').eq('id', id).maybeSingle();
      if (data) setForm(data as Worker);
    })();
  }, [id, editing]);

  function set<K extends keyof Worker>(key: K, value: Worker[K]) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const payload = { ...form, organisation_id: ORG_ID };
    const result = editing
      ? await supabase.from('workers').update(payload).eq('id', id)
      : await supabase.from('workers').insert(payload).select('id').single();
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    const newId = editing ? id : (result.data as { id: string }).id;
    navigate(`${base}/${newId}`);
  }

  const noun = app === 'hr' ? 'employee' : 'worker';

  return (
    <div className="max-w-3xl">
      <PageHeader title={editing ? `Edit ${noun}` : `Add ${noun}`} subtitle="Personal, employment and immigration details." />
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-6">
          <h2 className="mb-4 text-base font-bold text-ink">Personal</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>First name</label><input className={field} required value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} /></div>
            <div><label className={labelCls}>Last name</label><input className={field} required value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} /></div>
            <div><label className={labelCls}>Date of birth</label><input type="date" className={field} value={form.date_of_birth ?? ''} onChange={(e) => set('date_of_birth', e.target.value)} /></div>
            <div><label className={labelCls}>Nationality</label><input className={field} value={form.nationality ?? ''} onChange={(e) => set('nationality', e.target.value)} /></div>
            <div><label className={labelCls}>Email</label><input type="email" className={field} value={form.personal_email ?? ''} onChange={(e) => set('personal_email', e.target.value)} /></div>
            <div><label className={labelCls}>Phone</label><input className={field} value={form.personal_phone ?? ''} onChange={(e) => set('personal_phone', e.target.value)} /></div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-base font-bold text-ink">Employment</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Employee number</label><input className={field} value={form.employee_number ?? ''} onChange={(e) => set('employee_number', e.target.value)} /></div>
            <div><label className={labelCls}>Job title</label><input className={field} value={form.job_title ?? ''} onChange={(e) => set('job_title', e.target.value)} /></div>
            <div><label className={labelCls}>Department</label>
              <select className={field} value={form.department_id ?? ''} onChange={(e) => set('department_id', e.target.value || null)}>
                <option value="">Not set</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Manager</label>
              <select className={field} value={form.manager_id ?? ''} onChange={(e) => set('manager_id', e.target.value || null)}>
                <option value="">Not set</option>
                {managers.filter((m) => m.id !== id).map((m) => <option key={m.id} value={m.id}>{fullName(m)}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Contract type</label>
              <select className={field} value={form.contract_type ?? ''} onChange={(e) => set('contract_type', e.target.value || null)}>
                <option value="">Not set</option>
                <option value="permanent">Permanent</option><option value="fixed_term">Fixed term</option><option value="contractor">Contractor</option><option value="part_time">Part time</option>
              </select>
            </div>
            <div><label className={labelCls}>SOC code</label><input className={field} value={form.soc_code ?? ''} onChange={(e) => set('soc_code', e.target.value)} /></div>
            <div><label className={labelCls}>Annual salary (£)</label><input type="number" className={field} value={form.annual_salary ?? ''} onChange={(e) => set('annual_salary', e.target.value ? Number(e.target.value) : null)} /></div>
            <div><label className={labelCls}>Work location</label><input className={field} value={form.work_location ?? ''} onChange={(e) => set('work_location', e.target.value)} /></div>
            <div><label className={labelCls}>Start date</label><input type="date" className={field} value={form.start_date ?? ''} onChange={(e) => set('start_date', e.target.value)} /></div>
            <div><label className={labelCls}>Employment status</label>
              <select className={field} value={form.employment_status} onChange={(e) => set('employment_status', e.target.value as EmploymentStatus)}>
                <option value="onboarding">Onboarding</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="left">Left</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-base font-bold text-ink">Immigration &amp; sponsorship</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Sponsorship type</label>
              <select className={field} value={form.sponsorship_type} onChange={(e) => set('sponsorship_type', e.target.value as SponsorshipType)}>
                <option value="sponsored">Sponsored</option><option value="settled">Settled</option><option value="british_irish">British or Irish</option><option value="other">Other</option>
              </select>
            </div>
            <div><label className={labelCls}>CoS reference</label><input className={field} value={form.cos_reference ?? ''} onChange={(e) => set('cos_reference', e.target.value)} /></div>
            <div><label className={labelCls}>Visa type</label><input className={field} value={form.visa_type ?? ''} onChange={(e) => set('visa_type', e.target.value)} /></div>
            <div><label className={labelCls}>Visa expiry</label><input type="date" className={field} value={form.visa_expiry ?? ''} onChange={(e) => set('visa_expiry', e.target.value)} /></div>
            <div className="flex items-center gap-2 pt-6">
              <input id="dbs" type="checkbox" checked={form.requires_dbs ?? false} onChange={(e) => set('requires_dbs', e.target.checked)} />
              <label htmlFor="dbs" className="text-sm text-ink-muted">Role requires a DBS check</label>
            </div>
          </div>
        </Card>

        {error && <p className="text-sm text-rag-red">{error}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : `Add ${noun}`}</Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
