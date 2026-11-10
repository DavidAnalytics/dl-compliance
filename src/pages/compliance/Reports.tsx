import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, SectionLabel } from '@/components/ui';
import { fullName, formatDate, workerStatus } from '@/lib/compliance';
import { generateAuditPack, type AuditInput } from '@/lib/auditPack';
import type { Worker, RightToWorkCheck, CrsSnapshot } from '@/types/database';

export function Reports() {
  const [snapshot, setSnapshot] = useState<CrsSnapshot | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rtw, setRtw] = useState<Record<string, RightToWorkCheck>>({});
  const [events, setEvents] = useState<{ event_type: string; deadline: string; status: string }[]>([]);
  const [pack, setPack] = useState<AuditInput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [o, s, w, r, e, rd, doc, ab, kp, gr] = await Promise.all([
        supabase.from('organisation').select('*').maybeSingle(),
        supabase.from('crs_snapshots').select('*').order('captured_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workers').select('*').neq('employment_status', 'left').order('last_name'),
        supabase.from('right_to_work_checks').select('*').order('checked_on', { ascending: false }),
        supabase.from('reportable_events').select('*'),
        supabase.from('required_documents').select('*'),
        supabase.from('documents').select('id,title,category,worker_id,retention_until'),
        supabase.from('absences').select('*').order('start_date', { ascending: false }),
        supabase.from('key_personnel').select('*'),
        supabase.from('soc_going_rates').select('*'),
      ]);
      const workersData = (w.data as Worker[]) ?? [];
      const checksData = (r.data as RightToWorkCheck[]) ?? [];
      setSnapshot(s.data as CrsSnapshot);
      setWorkers(workersData);
      const map: Record<string, RightToWorkCheck> = {};
      for (const c of checksData) if (!map[c.worker_id]) map[c.worker_id] = c;
      setRtw(map);
      setEvents(((e.data as { event_type: string; deadline: string; status: string }[]) ?? []).filter((x) => x.status === 'due'));
      setPack({
        org: (o.data as Record<string, unknown>) ?? null, workers: workersData as unknown as Record<string, unknown>[],
        checks: checksData as unknown as Record<string, unknown>[], reqDocs: (rd.data as Record<string, unknown>[]) ?? [],
        documents: (doc.data as Record<string, unknown>[]) ?? [], absences: (ab.data as Record<string, unknown>[]) ?? [],
        events: (e.data as Record<string, unknown>[]) ?? [], keyPersonnel: (kp.data as Record<string, unknown>[]) ?? [],
        rates: (gr.data as Record<string, unknown>[]) ?? [], snapshot: (s.data as Record<string, unknown>) ?? null,
      });
      setLoading(false);
    })();
  }, []);

  function generatePack() { if (pack) generateAuditPack(pack); }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  const outstanding = events.length;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Inspection-ready summary and the one-click audit pack."
        actions={<Button onClick={generatePack}><span className="inline-flex items-center gap-1.5"><FileDown size={16} /> Generate audit pack</span></Button>} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Readiness score</p><p className="mt-2 text-3xl font-extrabold text-ink">{snapshot?.overall_score ?? '—'}<span className="text-lg text-ink-faint">/100</span></p></Card>
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Engaged workers</p><p className="mt-2 text-3xl font-extrabold text-ink">{workers.length}</p></Card>
        <Card className="p-5"><p className="text-sm font-semibold text-ink-muted">Outstanding reports</p><p className={`mt-2 text-3xl font-extrabold ${outstanding ? 'text-rag-red' : 'text-ink'}`}>{outstanding}</p></Card>
      </div>

      <div className="mt-6">
        <SectionLabel>Workers summary</SectionLabel>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Sponsorship</th><th className="px-5 py-3">Visa expiry</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {workers.map((w) => {
                const s = workerStatus(w, rtw[w.id]);
                return <tr key={w.id} className="text-ink-muted"><td className="px-5 py-3 font-semibold text-ink">{fullName(w)}</td><td className="px-5 py-3">{w.job_title ?? '—'}</td><td className="px-5 py-3 capitalize">{w.sponsorship_type.replace(/_/g, ' ')}</td><td className="px-5 py-3">{formatDate(w.visa_expiry)}</td><td className="px-5 py-3">{s.headline}</td></tr>;
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
