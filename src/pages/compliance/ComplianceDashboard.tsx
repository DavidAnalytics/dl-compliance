import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, SectionLabel, StatusPill, Avatar } from '@/components/ui';
import { CRS_DOMAINS, ratingFor, type CrsDomain } from '@/lib/crs';
import { workerStatus, fullName } from '@/lib/compliance';
import type { CrsSnapshot, Worker, RightToWorkCheck, RagRating } from '@/types/database';

const ragText: Record<RagRating, string> = { green: 'text-rag-green', amber: 'text-rag-amber', red: 'text-rag-red' };
const ragBar: Record<RagRating, string> = { green: 'bg-rag-green', amber: 'bg-rag-amber', red: 'bg-rag-red' };

export function ComplianceDashboard() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<CrsSnapshot | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rtwByWorker, setRtwByWorker] = useState<Record<string, RightToWorkCheck>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: snap }, { data: w }, { data: rtw }] = await Promise.all([
        supabase.from('crs_snapshots').select('*').order('captured_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workers').select('*').neq('employment_status', 'left'),
        supabase.from('right_to_work_checks').select('*').order('checked_on', { ascending: false }),
      ]);
      setSnapshot((snap as CrsSnapshot) ?? null);
      setWorkers((w as Worker[]) ?? []);
      const map: Record<string, RightToWorkCheck> = {};
      for (const c of (rtw as RightToWorkCheck[]) ?? []) if (!map[c.worker_id]) map[c.worker_id] = c;
      setRtwByWorker(map);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-ink-muted">Loading dashboard…</p>;

  const alerts = workers
    .map((w) => ({ w, s: workerStatus(w, rtwByWorker[w.id]) }))
    .filter((x) => x.s.rating !== 'green')
    .sort((a, b) => (a.s.rating === 'red' ? 0 : 1) - (b.s.rating === 'red' ? 0 : 1));

  const overall = snapshot?.overall_score ?? 0;
  const overallRating = snapshot?.overall_rating ?? ratingFor(overall);

  return (
    <div className="space-y-6">
      {/* Welcome / score panel */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl bg-brand-gradient p-5 sm:p-7 text-white shadow-nav lg:col-span-2">
          <div className="flex items-center gap-2 text-white/80">
            <ShieldCheck size={18} /> <span className="text-sm font-semibold">Sponsor licence compliance</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold">You are inspection-ready when this is green</h1>
          <p className="mt-1 max-w-lg text-sm text-white/80">
            DL Business Systems Ltd, company number 17211065. Right to work, records and sponsor duties, tracked in one place.
          </p>
          <button onClick={() => navigate('/compliance/workers')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-white/90">
            Open the register <ArrowRight size={16} />
          </button>
        </div>

        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-semibold text-ink-muted">Readiness Score</p>
          <p className={`mt-2 text-6xl font-extrabold ${ragText[overallRating]}`}>{overall}</p>
          <p className="text-sm text-ink-faint">out of 100</p>
          <div className="mt-3"><StatusPill rating={overallRating} label={overallRating === 'green' ? 'On track' : overallRating === 'amber' ? 'Needs attention' : 'At risk'} /></div>
        </Card>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Users size={20} strokeWidth={2.3} /></div>
          <div><p className="text-2xl font-extrabold text-ink">{workers.length}</p><p className="text-sm font-semibold text-ink-muted">Engaged workers</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rag-amberbg text-rag-amber"><AlertTriangle size={20} strokeWidth={2.3} /></div>
          <div><p className="text-2xl font-extrabold text-ink">{alerts.length}</p><p className="text-sm font-semibold text-ink-muted">Items needing attention</p></div>
        </Card>
      </div>

      {/* Needs attention */}
      <Card className="p-6">
        <SectionLabel>Needs attention</SectionLabel>
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nothing outstanding. Visa dates and follow-up checks are clear.</p>
        ) : (
          <ul className="divide-y divide-line">
            {alerts.map(({ w, s }) => (
              <li key={w.id} onClick={() => navigate(`/compliance/workers/${w.id}`)} className="flex cursor-pointer items-center gap-3 py-3 transition hover:opacity-80">
                <Avatar name={fullName(w)} size="sm" />
                <span className="flex-1 text-sm font-semibold text-ink">{fullName(w)}</span>
                <StatusPill rating={s.rating} label={s.headline} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Domain breakdown */}
      <div>
        <SectionLabel>Readiness by domain</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRS_DOMAINS.map((d: CrsDomain) => {
            const score = (snapshot?.[d.key] as number | null) ?? 0;
            const rating = ratingFor(score);
            return (
              <Card key={d.key} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{d.label}</p>
                  <span className={`text-sm font-bold ${ragText[rating]}`}>{score}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                  <div className={`h-full rounded-full ${ragBar[rating]}`} style={{ width: `${score}%` }} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <p className="pt-2 text-xs text-ink-faint">
        Internal record-keeping system. Not a substitute for legal advice. The score and alerts recalculate automatically once the nightly engine is live.
      </p>
    </div>
  );
}
