import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageHeader, StatusPill, Button, Code, EmptyState } from '@/components/ui';
import { workerStatus, fullName, formatDate } from '@/lib/compliance';
import type { Worker, RightToWorkCheck } from '@/types/database';

export function WorkersRegister() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rtwByWorker, setRtwByWorker] = useState<Record<string, RightToWorkCheck>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: w }, { data: rtw }] = await Promise.all([
        supabase.from('workers').select('*').order('last_name'),
        supabase.from('right_to_work_checks').select('*').order('checked_on', { ascending: false }),
      ]);
      setWorkers((w as Worker[]) ?? []);
      // keep the most recent check per worker
      const map: Record<string, RightToWorkCheck> = {};
      for (const c of (rtw as RightToWorkCheck[]) ?? []) {
        if (!map[c.worker_id]) map[c.worker_id] = c;
      }
      setRtwByWorker(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter((w) =>
      [w.first_name, w.last_name, w.job_title, w.nationality, w.cos_reference]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(q))
    );
  }, [workers, query]);

  return (
    <div>
      <PageHeader
        title="Engaged Workers"
        subtitle="Every worker on the register, with live compliance status."
        actions={<Button onClick={() => navigate('/workers/new')}>Add worker</Button>}
      />

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, role, nationality or CoS"
          className="w-full max-w-sm rounded-md border border-line bg-surface px-3 py-2 text-sm placeholder:text-content-muted focus:border-brass focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="text-sm text-content-muted">Loading the register…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No workers match that search' : 'No workers yet'}
          hint={query ? 'Try a different name or clear the search.' : 'Add your first worker to start the register.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-paper/60 text-left text-xs text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Worker</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Sponsorship</th>
                <th className="px-4 py-3 font-medium">Visa expiry</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((w) => {
                const status = workerStatus(w, rtwByWorker[w.id]);
                return (
                  <tr
                    key={w.id}
                    onClick={() => navigate(`/workers/${w.id}`)}
                    className="cursor-pointer transition hover:bg-paper"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-content-strong">{fullName(w)}</p>
                      <p className="text-xs text-content-muted">{w.nationality ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-content">
                      {w.job_title ?? '—'}
                      {w.soc_code && <span className="ml-2"><Code>{w.soc_code}</Code></span>}
                    </td>
                    <td className="px-4 py-3 capitalize text-content">
                      {w.sponsorship_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-content">{formatDate(w.visa_expiry)}</td>
                    <td className="px-4 py-3">
                      <StatusPill rating={status.rating} label={status.headline} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
