import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusPill, Button, Code, Card, Avatar } from '@/components/ui';
import { workerStatus, fullName, formatDate, formatMoney, daysUntil } from '@/lib/compliance';
import type { Worker, RightToWorkCheck, Absence, RequiredDocument, SocGoingRate, RagRating } from '@/types/database';

type AppVariant = 'compliance' | 'hr';
type DbsRow = { id: string; worker_id: string; level: string; issue_date: string | null; renewal_due: string | null };
type AuditRow = { id: number; actor_email: string | null; action: string; summary: string | null; created_at: string };

const complianceTabs = ['Overview', 'Right to Work', 'Absence', 'Documents', 'Audit'] as const;
const hrTabs = ['Overview', 'Absence'] as const;

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

export function WorkerProfile({ app }: { app: AppVariant }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = app === 'hr' ? '/hr/employees' : '/compliance/workers';
  const tabs = app === 'hr' ? hrTabs : complianceTabs;
  const [worker, setWorker] = useState<Worker | null>(null);
  const [rtw, setRtw] = useState<RightToWorkCheck[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [reqDocs, setReqDocs] = useState<RequiredDocument[]>([]);
  const [dbs, setDbs] = useState<DbsRow[]>([]);
  const [rate, setRate] = useState<SocGoingRate | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [tab, setTab] = useState<string>('Overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: w } = await supabase.from('workers').select('*').eq('id', id).maybeSingle();
      const worker = w as Worker | null;
      setWorker(worker);
      const [rtwRes, absRes, rdRes, dbsRes, auditRes] = await Promise.all([
        supabase.from('right_to_work_checks').select('*').eq('worker_id', id).order('checked_on', { ascending: false }),
        supabase.from('absences').select('*').eq('worker_id', id).order('start_date', { ascending: false }),
        supabase.from('required_documents').select('*').eq('worker_id', id),
        supabase.from('dbs_checks').select('*').eq('worker_id', id),
        supabase.from('audit_log').select('id,actor_email,action,summary,created_at').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
      ]);
      setRtw((rtwRes.data as RightToWorkCheck[]) ?? []);
      setAbsences((absRes.data as Absence[]) ?? []);
      setReqDocs((rdRes.data as RequiredDocument[]) ?? []);
      setDbs((dbsRes.data as DbsRow[]) ?? []);
      setAudit((auditRes.data as AuditRow[]) ?? []);
      if (worker?.soc_code) {
        const { data: r } = await supabase.from('soc_going_rates').select('*').eq('soc_code', worker.soc_code).maybeSingle();
        setRate((r as SocGoingRate) ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

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

      {/* Header */}
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={fullName(worker)} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-ink">{fullName(worker)}</h1>
              <p className="text-sm text-ink-muted">
                {worker.job_title ?? 'Role not set'} · <span className="capitalize">{worker.employment_status}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {app === 'compliance' && <StatusPill rating={status.rating} label={status.headline} />}
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

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative px-3.5 py-2.5 text-sm font-semibold transition ${tab === t ? 'text-brand-600' : 'text-ink-faint hover:text-ink'}`}>
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
              <Field label="Job title">{worker.job_title ?? '—'}</Field>
              <Field label="SOC code">{worker.soc_code ? <Code>{worker.soc_code}</Code> : '—'}</Field>
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
            </div>
          </Card>
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
      {tab === 'Documents' && (
        <TabTable rows={reqDocs} empty="The required-documents checklist is not set up for this worker yet."
          head={['Document', 'Required', 'Status', 'Expiry', 'Review']}
          render={(d) => [d.label, d.required ? 'Yes' : 'No', d.status, formatDate(d.expiry_date), formatDate(d.review_date)]} />
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
  if (rows.length === 0) {
    return <Card className="px-6 py-12 text-center text-sm text-ink-muted">{empty}</Card>;
  }
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
          <tr>{head.map((h) => <th key={h} className="px-5 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className="text-ink-muted">
              {render(row).map((cell, i) => <td key={i} className="px-5 py-3 capitalize">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
