import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { StatusPill, Button, Code, SectionLabel } from '@/components/ui';
import { workerStatus, fullName, formatDate, formatMoney, daysUntil } from '@/lib/compliance';
import type {
  Worker, RightToWorkCheck, Absence, RequiredDocument,
  SocGoingRate, RagRating,
} from '@/types/database';

type DbsCheckRowT = {
  id: string; worker_id: string; level: string; certificate_no: string | null;
  issue_date: string | null; renewal_due: string | null; notes: string | null;
};
type AuditRowT = {
  id: number; actor_email: string | null; action: string; entity: string;
  summary: string | null; created_at: string;
};

const TABS = ['Overview', 'Right to Work', 'Absence', 'Documents', 'Audit'] as const;
type Tab = (typeof TABS)[number];

function Check({ label, rating, value }: { label: string; rating: RagRating; value: string }) {
  const ring = rating === 'green' ? 'border-rag-green/30' : rating === 'amber' ? 'border-rag-amber/30' : 'border-rag-red/30';
  const dot = rating === 'green' ? 'bg-rag-green' : rating === 'amber' ? 'bg-rag-amber' : 'bg-rag-red';
  return (
    <div className={`rounded-lg border bg-surface p-3 ${ring}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-2xs font-medium uppercase tracking-wide text-content-muted">{label}</p>
      </div>
      <p className="mt-1 text-sm font-medium text-content-strong">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-content-muted">{label}</p>
      <p className="mt-0.5 text-sm text-content-strong">{children}</p>
    </div>
  );
}

export function WorkerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [rtw, setRtw] = useState<RightToWorkCheck[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [reqDocs, setReqDocs] = useState<RequiredDocument[]>([]);
  const [dbs, setDbs] = useState<DbsCheckRowT[]>([]);
  const [rate, setRate] = useState<SocGoingRate | null>(null);
  const [audit, setAudit] = useState<AuditRowT[]>([]);
  const [tab, setTab] = useState<Tab>('Overview');
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
        supabase.from('audit_log').select('id,actor_email,action,entity,summary,created_at').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
      ]);
      setRtw((rtwRes.data as RightToWorkCheck[]) ?? []);
      setAbsences((absRes.data as Absence[]) ?? []);
      setReqDocs((rdRes.data as RequiredDocument[]) ?? []);
      setDbs((dbsRes.data as DbsCheckRowT[]) ?? []);
      setAudit((auditRes.data as AuditRowT[]) ?? []);

      if (worker?.soc_code) {
        const { data: r } = await supabase.from('soc_going_rates').select('*').eq('soc_code', worker.soc_code).maybeSingle();
        setRate((r as SocGoingRate) ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-sm text-content-muted">Loading worker…</p>;
  if (!worker) return <p className="text-sm text-content-muted">Worker not found.</p>;

  const latestRtw = rtw[0] ?? null;
  const status = workerStatus(worker, latestRtw);
  const sponsored = worker.sponsorship_type === 'sponsored';

  // Six per-worker checks
  const visaDays = daysUntil(worker.visa_expiry);
  const rtwRating: RagRating = !sponsored ? 'green' : !latestRtw ? 'red' : latestRtw.outcome === 'fail' ? 'red' : 'green';
  const visaRating: RagRating = visaDays === null ? 'green' : visaDays < 0 ? 'red' : visaDays <= 90 ? 'amber' : 'green';
  const docsPresent = reqDocs.filter((d) => d.status === 'present').length;
  const docsReq = reqDocs.filter((d) => d.required).length;
  const docsRating: RagRating = docsReq === 0 ? 'amber' : docsPresent >= docsReq ? 'green' : 'amber';
  const reportableAbs = absences.filter((a) => a.reportable).length;
  const absRating: RagRating = reportableAbs > 0 ? 'red' : 'green';
  const dbsRating: RagRating = !worker.requires_dbs ? 'green' : dbs.length ? 'green' : 'red';
  const salaryRating: RagRating =
    !rate?.going_rate_annual || worker.annual_salary === null
      ? 'amber'
      : worker.annual_salary >= rate.going_rate_annual
        ? 'green'
        : 'red';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/workers')} className="mb-3 text-xs text-content-muted hover:text-content-strong">
          Back to register
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-content-strong">{fullName(worker)}</h1>
            <p className="mt-1 text-sm text-content-muted">
              {worker.job_title ?? 'Role not set'} · <span className="capitalize">{worker.sponsorship_type.replace(/_/g, ' ')}</span> · <span className="capitalize">{worker.employment_status}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill rating={status.rating} label={status.headline} />
            <Button variant="secondary" onClick={() => navigate(`/workers/${id}/edit`)}>Edit</Button>
          </div>
        </div>
      </div>

      {/* Compliance strip */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Check label="Right to work" rating={rtwRating} value={!sponsored ? 'Not required' : latestRtw ? 'On file' : 'Missing'} />
        <Check label="Visa" rating={visaRating} value={visaDays === null ? '—' : visaDays < 0 ? 'Expired' : `${visaDays}d left`} />
        <Check label="Documents" rating={docsRating} value={docsReq ? `${docsPresent}/${docsReq}` : 'Not set up'} />
        <Check label="Absence" rating={absRating} value={reportableAbs ? `${reportableAbs} reportable` : 'Clear'} />
        <Check label="DBS" rating={dbsRating} value={!worker.requires_dbs ? 'Not required' : dbs.length ? 'On file' : 'Missing'} />
        <Check label="Salary vs rate" rating={salaryRating} value={!rate ? 'No rate set' : salaryRating === 'green' ? 'At or above' : salaryRating === 'red' ? 'Below rate' : '—'} />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3 py-2 text-sm font-medium transition ${
              tab === t ? 'text-content-strong' : 'text-content-muted hover:text-content'
            }`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brass" />}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-8">
          <section className="rounded-xl border border-line bg-surface p-6 shadow-card">
            <SectionLabel>Employment &amp; CoS</SectionLabel>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="SOC code"><Code>{worker.soc_code ?? '—'}</Code></Field>
              <Field label="Salary">{formatMoney(worker.annual_salary)}</Field>
              <Field label="Going rate">{rate?.going_rate_annual ? formatMoney(rate.going_rate_annual) : 'Not set'}</Field>
              <Field label="CoS reference"><Code>{worker.cos_reference ?? '—'}</Code></Field>
              <Field label="Start date">{formatDate(worker.start_date)}</Field>
              <Field label="Work location">{worker.work_location ?? '—'}</Field>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-6 shadow-card">
            <SectionLabel>Immigration</SectionLabel>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="Nationality">{worker.nationality ?? '—'}</Field>
              <Field label="Visa type">{worker.visa_type ?? '—'}</Field>
              <Field label="Visa expiry">{formatDate(worker.visa_expiry)}</Field>
              <Field label="Statutory excuse">{latestRtw ? latestRtw.excuse_type.replace(/_/g, ' ') : '—'}</Field>
              <Field label="Follow-up due">{formatDate(latestRtw?.excuse_expiry ?? latestRtw?.follow_up_due ?? null)}</Field>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-6 shadow-card">
            <SectionLabel>Contact</SectionLabel>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="Email">{worker.personal_email ?? '—'}</Field>
              <Field label="Phone">{worker.personal_phone ?? '—'}</Field>
            </div>
          </section>
        </div>
      )}

      {tab === 'Right to Work' && (
        <TabTable
          rows={rtw}
          empty="No right to work checks recorded yet."
          head={['Checked', 'Method', 'Share code', 'Excuse', 'Follow-up', 'Outcome']}
          render={(c) => [
            formatDate(c.checked_on),
            c.method.replace(/_/g, ' '),
            c.share_code ? <Code>{c.share_code}</Code> : '—',
            c.excuse_type.replace(/_/g, ' '),
            formatDate(c.excuse_expiry ?? c.follow_up_due),
            c.outcome.replace(/_/g, ' '),
          ]}
        />
      )}

      {tab === 'Absence' && (
        <TabTable
          rows={absences}
          empty="No absences recorded."
          head={['From', 'To', 'Type', 'Working days', 'Reportable']}
          render={(a) => [
            formatDate(a.start_date),
            formatDate(a.end_date),
            a.absence_type,
            a.working_days ?? '—',
            a.reportable ? 'Yes' : 'No',
          ]}
        />
      )}

      {tab === 'Documents' && (
        <TabTable
          rows={reqDocs}
          empty="The required-documents checklist has not been set up for this worker yet."
          head={['Document', 'Required', 'Status', 'Expiry', 'Review']}
          render={(d) => [
            d.label,
            d.required ? 'Yes' : 'No',
            d.status,
            formatDate(d.expiry_date),
            formatDate(d.review_date),
          ]}
        />
      )}

      {tab === 'Audit' && (
        <TabTable
          rows={audit}
          empty="No recorded activity for this worker yet."
          head={['When', 'Who', 'Action', 'Detail']}
          render={(a) => [
            new Date(a.created_at).toLocaleString('en-GB'),
            a.actor_email ?? 'system',
            a.action,
            a.summary ?? '—',
          ]}
        />
      )}
    </div>
  );
}

function TabTable<T extends { id: string | number }>({
  rows, head, render, empty,
}: {
  rows: T[];
  head: string[];
  render: (row: T) => React.ReactNode[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-content-muted">{empty}</div>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-paper/60 text-left text-xs text-content-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className="text-content">
              {render(row).map((cell, i) => (
                <td key={i} className="px-4 py-3 capitalize">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
