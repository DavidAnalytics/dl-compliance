import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusPill, Button, Code, Card, Avatar } from '@/components/ui';
import { workerStatus, fullName, formatDate, formatMoney, daysUntil } from '@/lib/compliance';
import { printHTML, field, table } from '@/lib/export';
import type {
  Worker, RightToWorkCheck, Absence, RequiredDocument, SocGoingRate, RagRating,
  Department, EmergencyContact, EmployeeEvent,
} from '@/types/database';

type AppVariant = 'compliance' | 'hr';
type DbsRow = { id: string; worker_id: string; level: string; issue_date: string | null; renewal_due: string | null };
type AuditRow = { id: number; actor_email: string | null; action: string; summary: string | null; created_at: string };
type DocRow = { id: string; title: string; category: string | null; created_at: string };

const complianceTabs = ['Overview', 'Right to Work', 'Absence', 'Documents', 'Audit'] as const;
const hrTabs = ['Overview', 'Emergency Contacts', 'Documents', 'History', 'Absence'] as const;

function Check({ label, rating, value }: { label: string; rating: RagRating; value: string }) {
  const dot = rating === 'green' ? 'bg-rag-green' : rating === 'amber' ? 'bg-rag-amber' : 'bg-rag-red';
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-2xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">{children}</p>
    </div>
  );
}

const inp = 'rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-brand-300 focus:outline-none';

export function WorkerProfile({ app }: { app: AppVariant }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = app === 'hr' ? '/hr/employees' : '/compliance/workers';
  const tabs = app === 'hr' ? hrTabs : complianceTabs;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [rtw, setRtw] = useState<RightToWorkCheck[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [reqDocs, setReqDocs] = useState<RequiredDocument[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [dbs, setDbs] = useState<DbsRow[]>([]);
  const [rate, setRate] = useState<SocGoingRate | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [dept, setDept] = useState<Department | null>(null);
  const [manager, setManager] = useState<Worker | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [events, setEvents] = useState<EmployeeEvent[]>([]);
  const [tab, setTab] = useState<string>('Overview');
  const [loading, setLoading] = useState(true);

  // inline form state
  const [newContact, setNewContact] = useState({ name: '', relationship: '', phone: '', email: '' });
  const [newEvent, setNewEvent] = useState({ event_type: 'note', effective_date: '', detail: '' });

  async function load() {
    if (!id) return;
    const { data: w } = await supabase.from('workers').select('*').eq('id', id).maybeSingle();
    const worker = w as Worker | null;
    setWorker(worker);
    const [rtwRes, absRes, rdRes, dbsRes, auditRes, docRes, ecRes, eeRes] = await Promise.all([
      supabase.from('right_to_work_checks').select('*').eq('worker_id', id).order('checked_on', { ascending: false }),
      supabase.from('absences').select('*').eq('worker_id', id).order('start_date', { ascending: false }),
      supabase.from('required_documents').select('*').eq('worker_id', id),
      supabase.from('dbs_checks').select('*').eq('worker_id', id),
      supabase.from('audit_log').select('id,actor_email,action,summary,created_at').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('documents').select('id,title,category,created_at').eq('worker_id', id).order('created_at', { ascending: false }),
      supabase.from('emergency_contacts').select('*').eq('worker_id', id).order('created_at'),
      supabase.from('employee_events').select('*').eq('worker_id', id).order('effective_date', { ascending: false }),
    ]);
    setRtw((rtwRes.data as RightToWorkCheck[]) ?? []);
    setAbsences((absRes.data as Absence[]) ?? []);
    setReqDocs((rdRes.data as RequiredDocument[]) ?? []);
    setDbs((dbsRes.data as DbsRow[]) ?? []);
    setAudit((auditRes.data as AuditRow[]) ?? []);
    setDocs((docRes.data as DocRow[]) ?? []);
    setContacts((ecRes.data as EmergencyContact[]) ?? []);
    setEvents((eeRes.data as EmployeeEvent[]) ?? []);
    if (worker?.soc_code) {
      const { data: r } = await supabase.from('soc_going_rates').select('*').eq('soc_code', worker.soc_code).maybeSingle();
      setRate((r as SocGoingRate) ?? null);
    }
    if (worker?.department_id) {
      const { data: d } = await supabase.from('departments').select('*').eq('id', worker.department_id).maybeSingle();
      setDept((d as Department) ?? null);
    } else setDept(null);
    if (worker?.manager_id) {
      const { data: m } = await supabase.from('workers').select('*').eq('id', worker.manager_id).maybeSingle();
      setManager((m as Worker) ?? null);
    } else setManager(null);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function addContact() {
    if (!newContact.name.trim() || !id) return;
    await supabase.from('emergency_contacts').insert({ worker_id: id, ...newContact });
    setNewContact({ name: '', relationship: '', phone: '', email: '' });
    load();
  }
  async function removeContact(cid: string) {
    await supabase.from('emergency_contacts').delete().eq('id', cid);
    load();
  }
  async function addEvent() {
    if (!newEvent.detail.trim() || !id) return;
    await supabase.from('employee_events').insert({
      worker_id: id, event_type: newEvent.event_type,
      effective_date: newEvent.effective_date || new Date().toISOString().slice(0, 10),
      detail: newEvent.detail,
    });
    setNewEvent({ event_type: 'note', effective_date: '', detail: '' });
    load();
  }

  function exportDossier() {
    if (!worker) return;
    const w = worker;
    const inner = `
      <h1>${fullName(w)}</h1>
      <p class="meta">${w.job_title ?? 'Role not set'}${dept ? ` · ${dept.name}` : ''} · ${w.employment_status} · generated ${new Date().toLocaleString('en-GB')}</p>
      <h2>Employment</h2>
      <div class="grid">
        ${field('Employee number', w.employee_number)}${field('Job title', w.job_title)}${field('Department', dept?.name)}
        ${field('Manager', manager ? fullName(manager) : null)}${field('Contract', w.contract_type?.replace(/_/g, ' '))}${field('SOC code', w.soc_code)}
        ${field('Salary', w.annual_salary != null ? formatMoney(w.annual_salary) : null)}${field('Going rate', rate?.going_rate_annual ? formatMoney(rate.going_rate_annual) : null)}
        ${field('Start date', formatDate(w.start_date))}${field('Work location', w.work_location)}
      </div>
      <h2>Immigration &amp; sponsorship</h2>
      <div class="grid">
        ${field('Nationality', w.nationality)}${field('Sponsorship', w.sponsorship_type.replace(/_/g, ' '))}${field('Visa type', w.visa_type)}
        ${field('Visa expiry', formatDate(w.visa_expiry))}${field('CoS reference', w.cos_reference)}
        ${field('Statutory excuse', latestRtw ? latestRtw.excuse_type.replace(/_/g, ' ') : null)}${field('Follow-up due', formatDate(latestRtw?.excuse_expiry ?? latestRtw?.follow_up_due ?? null))}
      </div>
      <h2>Contact</h2>
      <div class="grid">${field('Email', w.personal_email)}${field('Phone', w.personal_phone)}${field('Home address', w.home_address)}</div>
      <h2>Emergency contacts</h2>
      ${table(['Name', 'Relationship', 'Phone', 'Email'], contacts.map((c) => [c.name, c.relationship, c.phone, c.email]), 'None recorded')}
      <h2>Right to work checks</h2>
      ${table(['Checked', 'Method', 'Share code', 'Excuse', 'Follow-up', 'Outcome'], rtw.map((c) => [formatDate(c.checked_on), c.method.replace(/_/g, ' '), c.share_code, c.excuse_type.replace(/_/g, ' '), formatDate(c.excuse_expiry ?? c.follow_up_due), c.outcome.replace(/_/g, ' ')]), 'None recorded')}
      <h2>DBS checks</h2>
      ${table(['Level', 'Issued', 'Renewal due'], dbs.map((d) => [d.level, formatDate(d.issue_date), formatDate(d.renewal_due)]), w.requires_dbs ? 'None recorded' : 'Not required for this role')}
      <h2>Absences</h2>
      ${table(['From', 'To', 'Type', 'Working days', 'Reportable'], absences.map((a) => [formatDate(a.start_date), formatDate(a.end_date), a.absence_type, a.working_days, a.reportable ? 'Yes' : 'No']), 'None recorded')}
      <h2>Documents on file</h2>
      ${table(['Document', 'Category', 'Added'], docs.map((d) => [d.title, d.category, formatDate(d.created_at)]), 'None on file')}
      <h2>History</h2>
      ${table(['Date', 'Event', 'Detail'], events.map((e) => [formatDate(e.effective_date), e.event_type.replace(/_/g, ' '), e.detail]), 'None recorded')}
    `;
    printHTML(`${fullName(w)} — worker record`, inner);
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (!worker) return <p className="text-sm text-ink-muted">Not found.</p>;

  const latestRtw = rtw[0] ?? null;
  const status = workerStatus(worker, latestRtw);
  const sponsored = worker.sponsorship_type === 'sponsored';
  const visaDays = daysUntil(worker.visa_expiry);
  const rtwRating: RagRating = !sponsored ? 'green' : !latestRtw ? 'red' : latestRtw.outcome === 'fail' ? 'red' : 'green';
  const visaRating: RagRating = visaDays === null ? 'green' : visaDays < 0 ? 'red' : visaDays <= 90 ? 'amber' : 'green';
  const docsPresent = reqDocs.filter((d) => d.status === 'present').length;
  const docsReq = reqDocs.filter((d) => d.required).length;
  const docsRating: RagRating = docsReq === 0 ? 'amber' : docsPresent >= docsReq ? 'green' : 'amber';
  const reportableAbs = absences.filter((a) => a.reportable).length;
  const absRating: RagRating = reportableAbs > 0 ? 'red' : 'green';
  const dbsRating: RagRating = !worker.requires_dbs ? 'green' : dbs.length ? 'green' : 'red';
  const salaryRating: RagRating = !rate?.going_rate_annual || worker.annual_salary === null ? 'amber'
    : worker.annual_salary >= rate.going_rate_annual ? 'green' : 'red';

  return (
    <div>
      <button onClick={() => navigate(base)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={16} /> Back
      </button>

      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={fullName(worker)} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-ink">{fullName(worker)}</h1>
              <p className="text-sm text-ink-muted">
                {worker.job_title ?? 'Role not set'}
                {dept && <> · {dept.name}</>} · <span className="capitalize">{worker.employment_status}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {app === 'compliance' && <StatusPill rating={status.rating} label={status.headline} />}
            <Button variant="secondary" size="sm" onClick={exportDossier}><span className="inline-flex items-center gap-1.5"><FileDown size={15} /> Export</span></Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`${base}/${id}/edit`)}>Edit</Button>
          </div>
        </div>

        {app === 'compliance' && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Check label="Right to work" rating={rtwRating} value={!sponsored ? 'N/A' : latestRtw ? 'On file' : 'Missing'} />
            <Check label="Visa" rating={visaRating} value={visaDays === null ? '—' : visaDays < 0 ? 'Expired' : `${visaDays}d`} />
            <Check label="Documents" rating={docsRating} value={docsReq ? `${docsPresent}/${docsReq}` : 'Not set'} />
            <Check label="Absence" rating={absRating} value={reportableAbs ? `${reportableAbs} flag` : 'Clear'} />
            <Check label="DBS" rating={dbsRating} value={!worker.requires_dbs ? 'N/A' : dbs.length ? 'On file' : 'Missing'} />
            <Check label="Salary" rating={salaryRating} value={!rate ? 'No rate' : salaryRating === 'green' ? 'OK' : salaryRating === 'red' ? 'Below' : '—'} />
          </div>
        )}
      </Card>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative whitespace-nowrap px-3.5 py-2.5 text-sm font-semibold transition ${tab === t ? 'text-brand-600' : 'text-ink-faint hover:text-ink'}`}>
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 text-base font-bold text-ink">Employment</h2>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {app === 'hr' && <Field label="Employee number">{worker.employee_number ?? '—'}</Field>}
              <Field label="Job title">{worker.job_title ?? '—'}</Field>
              {app === 'hr' && <Field label="Department">{dept?.name ?? '—'}</Field>}
              {app === 'hr' && <Field label="Manager">{manager ? fullName(manager) : '—'}</Field>}
              {app === 'hr' && <Field label="Contract">{worker.contract_type?.replace(/_/g, ' ') ?? '—'}</Field>}
              {app === 'compliance' && <Field label="SOC code">{worker.soc_code ? <Code>{worker.soc_code}</Code> : '—'}</Field>}
              <Field label="Salary">{formatMoney(worker.annual_salary)}</Field>
              <Field label="Start date">{formatDate(worker.start_date)}</Field>
              <Field label="Work location">{worker.work_location ?? '—'}</Field>
              {app === 'compliance' && <Field label="Going rate">{rate?.going_rate_annual ? formatMoney(rate.going_rate_annual) : 'Not set'}</Field>}
            </div>
          </Card>

          {app === 'compliance' && (
            <Card className="p-6">
              <h2 className="mb-4 text-base font-bold text-ink">Immigration</h2>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                <Field label="Nationality">{worker.nationality ?? '—'}</Field>
                <Field label="Visa type">{worker.visa_type ?? '—'}</Field>
                <Field label="Visa expiry">{formatDate(worker.visa_expiry)}</Field>
                <Field label="CoS reference">{worker.cos_reference ? <Code>{worker.cos_reference}</Code> : '—'}</Field>
                <Field label="Statutory excuse">{latestRtw ? latestRtw.excuse_type.replace(/_/g, ' ') : '—'}</Field>
                <Field label="Follow-up due">{formatDate(latestRtw?.excuse_expiry ?? latestRtw?.follow_up_due ?? null)}</Field>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="mb-4 text-base font-bold text-ink">Contact</h2>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="Email">{worker.personal_email ?? '—'}</Field>
              <Field label="Phone">{worker.personal_phone ?? '—'}</Field>
              <Field label="Nationality">{worker.nationality ?? '—'}</Field>
            </div>
          </Card>
        </div>
      )}

      {tab === 'Emergency Contacts' && (
        <div className="space-y-4">
          {contacts.length === 0 ? (
            <Card className="px-6 py-10 text-center text-sm text-ink-muted">No emergency contacts yet.</Card>
          ) : (
            <Card className="divide-y divide-line">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{c.name} <span className="font-normal text-ink-faint">· {c.relationship || '—'}</span></p>
                    <p className="text-xs text-ink-muted">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <button onClick={() => removeContact(c.id)} className="rounded-lg p-2 text-ink-faint hover:bg-rag-redbg hover:text-rag-red"><Trash2 size={16} /></button>
                </div>
              ))}
            </Card>
          )}
          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-ink">Add a contact</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input className={inp} placeholder="Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              <input className={inp} placeholder="Relationship" value={newContact.relationship} onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })} />
              <input className={inp} placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
              <input className={inp} placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
            </div>
            <div className="mt-3"><Button size="sm" onClick={addContact}><span className="inline-flex items-center gap-1.5"><Plus size={14} /> Add contact</span></Button></div>
          </Card>
        </div>
      )}

      {tab === 'Documents' && (
        docs.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-ink-muted">No documents on file yet. Upload arrives with the documents module.</Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
                <tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Added</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {docs.map((d) => (
                  <tr key={d.id} className="text-ink-muted"><td className="px-5 py-3 font-medium text-ink">{d.title}</td><td className="px-5 py-3 capitalize">{d.category ?? '—'}</td><td className="px-5 py-3">{formatDate(d.created_at)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {tab === 'History' && (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-ink">Record a change</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <select className={inp} value={newEvent.event_type} onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}>
                <option value="note">Note</option><option value="promotion">Promotion</option><option value="transfer">Transfer</option><option value="status_change">Status change</option>
              </select>
              <input type="date" className={inp} value={newEvent.effective_date} onChange={(e) => setNewEvent({ ...newEvent, effective_date: e.target.value })} />
              <input className={`${inp} sm:col-span-2`} placeholder="Detail" value={newEvent.detail} onChange={(e) => setNewEvent({ ...newEvent, detail: e.target.value })} />
            </div>
            <div className="mt-3"><Button size="sm" onClick={addEvent}><span className="inline-flex items-center gap-1.5"><Plus size={14} /> Record</span></Button></div>
          </Card>

          {events.length > 0 && (
            <Card className="divide-y divide-line">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3">
                  <div><p className="text-sm font-semibold capitalize text-ink">{e.event_type.replace(/_/g, ' ')}</p><p className="text-xs text-ink-muted">{e.detail}</p></div>
                  <span className="text-xs text-ink-faint">{formatDate(e.effective_date)}</span>
                </div>
              ))}
            </Card>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Activity log</p>
            {audit.length === 0 ? (
              <Card className="px-5 py-8 text-center text-sm text-ink-muted">No recorded activity yet.</Card>
            ) : (
              <Card className="divide-y divide-line">
                {audit.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="text-ink">{a.summary ?? a.action}</span>
                    <span className="text-xs text-ink-faint">{new Date(a.created_at).toLocaleString('en-GB')}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'Right to Work' && (
        <TabTable rows={rtw} empty="No right to work checks recorded yet."
          head={['Checked', 'Method', 'Share code', 'Excuse', 'Follow-up', 'Outcome']}
          render={(c) => [formatDate(c.checked_on), c.method.replace(/_/g, ' '), c.share_code ? <Code>{c.share_code}</Code> : '—', c.excuse_type.replace(/_/g, ' '), formatDate(c.excuse_expiry ?? c.follow_up_due), c.outcome.replace(/_/g, ' ')]} />
      )}
      {tab === 'Absence' && (
        <TabTable rows={absences} empty="No absences recorded."
          head={['From', 'To', 'Type', 'Days', app === 'compliance' ? 'Reportable' : 'Reason']}
          render={(a) => [formatDate(a.start_date), formatDate(a.end_date), a.absence_type, a.working_days ?? '—', app === 'compliance' ? (a.reportable ? 'Yes' : 'No') : (a.reason ?? '—')]} />
      )}
      {tab === 'Audit' && (
        <TabTable rows={audit} empty="No recorded activity for this worker yet."
          head={['When', 'Who', 'Action', 'Detail']}
          render={(a) => [new Date(a.created_at).toLocaleString('en-GB'), a.actor_email ?? 'system', a.action, a.summary ?? '—']} />
      )}
    </div>
  );
}

function TabTable<T extends { id: string | number }>({ rows, head, render, empty }: {
  rows: T[]; head: string[]; render: (row: T) => React.ReactNode[]; empty: string;
}) {
  if (rows.length === 0) return <Card className="px-6 py-12 text-center text-sm text-ink-muted">{empty}</Card>;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
          <tr>{head.map((h) => <th key={h} className="px-5 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className="text-ink-muted">{render(row).map((cell, i) => <td key={i} className="px-5 py-3 capitalize">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
