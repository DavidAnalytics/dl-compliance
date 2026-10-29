import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyWorker } from '@/lib/me';
import { PageHeader, Card, Avatar } from '@/components/ui';
import { fullName, formatDate, formatMoney } from '@/lib/compliance';
import type { Worker } from '@/types/database';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">{children}</p>
    </div>
  );
}

export function MyDetails() {
  const { session } = useAuth();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [dept, setDept] = useState<string>('—');
  const [manager, setManager] = useState<string>('—');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!session) return;
      const w = await fetchMyWorker(session.user.id);
      setWorker(w);
      if (w?.department_id) {
        const { data } = await supabase.from('departments').select('name').eq('id', w.department_id).maybeSingle();
        setDept((data as { name: string })?.name ?? '—');
      }
      if (w?.manager_id) {
        const { data } = await supabase.from('workers').select('first_name,last_name').eq('id', w.manager_id).maybeSingle();
        const m = data as { first_name: string; last_name: string } | null;
        setManager(m ? `${m.first_name} ${m.last_name}` : '—');
      }
      setLoading(false);
    })();
  }, [session]);

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (!worker) return <p className="text-sm text-ink-muted">No employee record is linked to your account yet. Contact HR.</p>;

  return (
    <div>
      <PageHeader title="My Details" subtitle="Your personal and employment information." />
      <Card className="mb-5 flex items-center gap-4 p-6">
        <Avatar name={fullName(worker)} size="lg" />
        <div>
          <h2 className="text-lg font-bold text-ink">{fullName(worker)}</h2>
          <p className="text-sm text-ink-muted">{worker.job_title ?? 'Role not set'}{dept !== '—' ? ` · ${dept}` : ''}</p>
        </div>
      </Card>

      <Card className="mb-5 p-6">
        <h2 className="mb-4 text-base font-bold text-ink">Employment</h2>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Field label="Employee number">{worker.employee_number ?? '—'}</Field>
          <Field label="Job title">{worker.job_title ?? '—'}</Field>
          <Field label="Department">{dept}</Field>
          <Field label="Manager">{manager}</Field>
          <Field label="Contract">{worker.contract_type?.replace(/_/g, ' ') ?? '—'}</Field>
          <Field label="Start date">{formatDate(worker.start_date)}</Field>
          <Field label="Work location">{worker.work_location ?? '—'}</Field>
          <Field label="Salary">{formatMoney(worker.annual_salary)}</Field>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-base font-bold text-ink">Personal</h2>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Field label="Nationality">{worker.nationality ?? '—'}</Field>
          <Field label="Email">{worker.personal_email ?? '—'}</Field>
          <Field label="Phone">{worker.personal_phone ?? '—'}</Field>
          <Field label="Visa type">{worker.visa_type ?? '—'}</Field>
          <Field label="Visa expiry">{formatDate(worker.visa_expiry)}</Field>
        </div>
      </Card>

      <p className="mt-4 text-xs text-ink-faint">To change any of these details, contact HR.</p>
    </div>
  );
}
