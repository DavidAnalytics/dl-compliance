import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, EmptyState, Avatar } from '@/components/ui';
import { fullName, formatDate } from '@/lib/compliance';
import type { Worker, Absence } from '@/types/database';

export function Leave() {
  const [rows, setRows] = useState<(Absence & { worker?: Worker })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: w }] = await Promise.all([
        supabase.from('absences').select('*').eq('absence_type', 'holiday').order('start_date', { ascending: false }),
        supabase.from('workers').select('*'),
      ]);
      const workers = (w as Worker[]) ?? [];
      setRows(((a as Absence[]) ?? []).map((row) => ({ ...row, worker: workers.find((x) => x.id === row.worker_id) })));
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Leave & Holiday" subtitle="Booked and past annual leave across the team." />
      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No leave booked yet" hint="Annual leave requests will appear here once the booking flow is live." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">From</th><th className="px-5 py-3">To</th><th className="px-5 py-3">Days</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.worker ? fullName(r.worker) : '?'} size="sm" />
                      <span className="font-semibold text-ink">{r.worker ? fullName(r.worker) : 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(r.start_date)}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(r.end_date)}</td>
                  <td className="px-5 py-3 text-ink-muted">{r.working_days ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
