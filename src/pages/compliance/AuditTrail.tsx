import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, EmptyState } from '@/components/ui';

interface AuditRow { id: number; actor_email: string | null; action: string; entity: string; summary: string | null; created_at: string; }

const actionStyle: Record<string, string> = {
  insert: 'bg-rag-greenbg text-rag-green',
  update: 'bg-brand-50 text-brand-600',
  delete: 'bg-rag-redbg text-rag-red',
};

export function AuditTrail() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('audit_log').select('id,actor_email,action,entity,summary,created_at').order('created_at', { ascending: false }).limit(300);
      setRows((data as AuditRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.entity, r.action, r.summary, r.actor_email].filter(Boolean).some((f) => (f as string).toLowerCase().includes(s)));
  }, [rows, q]);

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="Complete, append-only record of every change. Nothing here can be edited or deleted." />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by table, action or person"
        className="mb-4 w-full max-w-sm rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm placeholder:text-ink-faint focus:border-brand-300 focus:outline-none" />
      {loading ? <p className="text-sm text-ink-muted">Loading…</p> : filtered.length === 0 ? (
        <EmptyState title="Nothing logged yet" hint="Activity appears here as records are created and changed." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">When</th><th className="px-5 py-3">Who</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Record</th><th className="px-5 py-3">Detail</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => (
                <tr key={r.id} className="text-ink-muted">
                  <td className="whitespace-nowrap px-5 py-3">{new Date(r.created_at).toLocaleString('en-GB')}</td>
                  <td className="px-5 py-3">{r.actor_email ?? 'system'}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-2xs font-semibold capitalize ${actionStyle[r.action] ?? 'bg-canvas text-ink-faint'}`}>{r.action}</span></td>
                  <td className="px-5 py-3">{r.entity.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 text-ink">{r.summary ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
