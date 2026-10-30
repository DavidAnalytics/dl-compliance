import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, StatusPill, Button, Code, EmptyState, Card, Avatar } from '@/components/ui';
import { workerStatus, fullName, formatDate } from '@/lib/compliance';
import { downloadCSV } from '@/lib/export';
import type { Worker, RightToWorkCheck, Department } from '@/types/database';

type AppVariant = 'compliance' | 'hr';

export function WorkersRegister({ app }: { app: AppVariant }) {
  const navigate = useNavigate();
  const base = app === 'hr' ? '/hr/employees' : '/compliance/workers';
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [depts, setDepts] = useState<Record<string, string>>({});
  const [rtwByWorker, setRtwByWorker] = useState<Record<string, RightToWorkCheck>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: w }, { data: rtw }, { data: d }] = await Promise.all([
        supabase.from('workers').select('*').order('last_name'),
        supabase.from('right_to_work_checks').select('*').order('checked_on', { ascending: false }),
        supabase.from('departments').select('*'),
      ]);
      setWorkers((w as Worker[]) ?? []);
      const map: Record<string, RightToWorkCheck> = {};
      for (const c of (rtw as RightToWorkCheck[]) ?? []) if (!map[c.worker_id]) map[c.worker_id] = c;
      setRtwByWorker(map);
      const dmap: Record<string, string> = {};
      for (const dep of (d as Department[]) ?? []) dmap[dep.id] = dep.name;
      setDepts(dmap);
      setLoading(false);
    })();
  }, []);

  const nameOf = (wid: string | null) => {
    if (!wid) return '—';
    const m = workers.find((x) => x.id === wid);
    return m ? fullName(m) : '—';
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter((w) =>
      [w.first_name, w.last_name, w.job_title, w.nationality, w.cos_reference, w.work_location]
        .filter(Boolean).some((f) => (f as string).toLowerCase().includes(q))
    );
  }, [workers, query]);

  const title = app === 'hr' ? 'Employees' : 'Engaged Workers';
  const subtitle = app === 'hr' ? 'Everyone on the team, with role and status.' : 'Every worker on the register, with live compliance status.';
  const addLabel = app === 'hr' ? 'Add employee' : 'Add worker';

  function exportCsv() {
    const today = new Date().toISOString().slice(0, 10);
    if (app === 'hr') {
      downloadCSV(`employees-${today}.csv`,
        ['Name', 'Employee number', 'Job title', 'Department', 'Manager', 'Contract', 'Status', 'Start date', 'Salary', 'Email', 'Phone'],
        filtered.map((w) => [fullName(w), w.employee_number, w.job_title, w.department_id ? depts[w.department_id] ?? '' : '', nameOf(w.manager_id), w.contract_type?.replace(/_/g, ' '), w.employment_status, w.start_date, w.annual_salary, w.personal_email, w.personal_phone]));
    } else {
      downloadCSV(`engaged-workers-${today}.csv`,
        ['Name', 'Job title', 'SOC code', 'Sponsorship', 'Visa type', 'Visa expiry', 'CoS reference', 'Status', 'Nationality', 'Start date', 'Salary'],
        filtered.map((w) => { const s = workerStatus(w, rtwByWorker[w.id]); return [fullName(w), w.job_title, w.soc_code, w.sponsorship_type.replace(/_/g, ' '), w.visa_type, w.visa_expiry, w.cos_reference, s.headline, w.nationality, w.start_date, w.annual_salary]; }));
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}><span className="inline-flex items-center gap-1.5"><FileDown size={16} /> Export CSV</span></Button>
          <Button onClick={() => navigate(`${base}/new`)}><span className="inline-flex items-center gap-1.5"><Plus size={16} /> {addLabel}</span></Button>
        </div>}
      />

      <div className="relative mb-4 max-w-sm">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, role or location"
          className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-faint focus:border-brand-300 focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No one matches that search' : 'No records yet'}
          hint={query ? 'Try a different term or clear the search.' : `Add your first ${app === 'hr' ? 'employee' : 'worker'} to begin.`}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr>
                <th className="px-5 py-3">{app === 'hr' ? 'Employee' : 'Worker'}</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">{app === 'hr' ? 'Department' : 'Sponsorship'}</th>
                <th className="px-5 py-3">{app === 'hr' ? 'Manager' : 'Visa expiry'}</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((w) => {
                const status = workerStatus(w, rtwByWorker[w.id]);
                return (
                  <tr key={w.id} onClick={() => navigate(`${base}/${w.id}`)} className="cursor-pointer transition hover:bg-canvas/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName(w)} size="sm" />
                        <div>
                          <p className="font-semibold text-ink">{fullName(w)}</p>
                          <p className="text-xs text-ink-faint">{w.nationality ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {w.job_title ?? '—'}{app !== 'hr' && w.soc_code && <span className="ml-2"><Code>{w.soc_code}</Code></span>}
                    </td>
                    <td className="px-5 py-3 capitalize text-ink-muted">
                      {app === 'hr' ? (w.department_id ? depts[w.department_id] ?? '—' : '—') : w.sponsorship_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{app === 'hr' ? nameOf(w.manager_id) : formatDate(w.visa_expiry)}</td>
                    <td className="px-5 py-3">
                      {app === 'hr'
                        ? <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold capitalize text-brand-700">{w.employment_status}</span>
                        : <StatusPill rating={status.rating} label={status.headline} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
