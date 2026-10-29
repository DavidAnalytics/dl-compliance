import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, SectionLabel } from '@/components/ui';
import { fullName, formatDate, workerStatus } from '@/lib/compliance';
import type { Worker, RightToWorkCheck, CrsSnapshot, Organisation } from '@/types/database';

export function Reports() {
  const [org, setOrg] = useState<Organisation | null>(null);
  const [snapshot, setSnapshot] = useState<CrsSnapshot | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rtw, setRtw] = useState<Record<string, RightToWorkCheck>>({});
  const [events, setEvents] = useState<{ event_type: string; deadline: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [o, s, w, r, e] = await Promise.all([
        supabase.from('organisation').select('*').maybeSingle(),
        supabase.from('crs_snapshots').select('*').order('captured_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workers').select('*').neq('employment_status', 'left').order('last_name'),
        supabase.from('right_to_work_checks').select('*').order('checked_on', { ascending: false }),
        supabase.from('reportable_events').select('event_type,deadline,status').eq('status', 'due'),
      ]);
      setOrg(o.data as Organisation);
      setSnapshot(s.data as CrsSnapshot);
      setWorkers((w.data as Worker[]) ?? []);
      const map: Record<string, RightToWorkCheck> = {};
      for (const c of (r.data as RightToWorkCheck[]) ?? []) if (!map[c.worker_id]) map[c.worker_id] = c;
      setRtw(map);
      setEvents((e.data as typeof events) ?? []);
      setLoading(false);
    })();
  }, []);

  function generatePack() {
    const now = new Date().toLocaleString('en-GB');
    const rows = workers.map((w) => {
      const s = workerStatus(w, rtw[w.id]);
      return `<tr><td>${fullName(w)}</td><td>${w.job_title ?? '—'}</td><td>${w.sponsorship_type.replace(/_/g, ' ')}</td><td>${w.visa_expiry ? formatDate(w.visa_expiry) : '—'}</td><td>${s.headline}</td></tr>`;
    }).join('');
    const evRows = events.map((e) => `<tr><td>${e.event_type.replace(/_/g, ' ')}</td><td>${formatDate(e.deadline)}</td><td>${e.status}</td></tr>`).join('') || '<tr><td colspan="3">None outstanding</td></tr>';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Compliance Audit Pack</title>
      <style>body{font-family:Arial,sans-serif;color:#1f1b3a;margin:40px;font-size:13px}h1{font-size:20px}h2{font-size:15px;margin-top:24px;border-bottom:2px solid #635BE5;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}th{background:#f4f4fb}.meta{color:#666}</style></head>
      <body>
      <h1>Sponsor Compliance Audit Pack</h1>
      <p class="meta">${org?.legal_name ?? 'DL Business Systems Ltd'} · Company number ${org?.company_number ?? '17211065'}<br/>
      Sponsor licence: ${org?.sponsor_licence_no ?? '—'} · Rating: ${org?.licence_rating ?? '—'} · Route: ${org?.licence_route ?? '—'}<br/>
      Generated ${now}</p>
      <h2>Compliance Readiness Score</h2>
      <p>${snapshot?.overall_score ?? '—'} / 100 (${snapshot?.overall_rating ?? '—'})</p>
      <h2>Engaged workers (${workers.length})</h2>
      <table><tr><th>Name</th><th>Role</th><th>Sponsorship</th><th>Visa expiry</th><th>Status</th></tr>${rows}</table>
      <h2>Outstanding reportable events</h2>
      <table><tr><th>Event</th><th>Deadline</th><th>Status</th></tr>${evRows}</table>
      <p class="meta" style="margin-top:30px">Internal record-keeping system. Not a substitute for legal advice.</p>
      </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 300); }
  }

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
