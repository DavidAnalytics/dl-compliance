import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CRS_DOMAINS, ratingFor, RAG_STYLES, type CrsDomain } from '@/lib/crs';
import { SectionLabel, StatusPill } from '@/components/ui';
import { workerStatus, fullName, daysUntil } from '@/lib/compliance';
import type { CrsSnapshot, Worker, RightToWorkCheck, RagRating } from '@/types/database';

interface Alert {
  worker: string;
  detail: string;
  rating: Exclude<RagRating, 'green'>;
}

export function Dashboard() {
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

  const alerts: Alert[] = [];
  for (const w of workers) {
    const s = workerStatus(w, rtwByWorker[w.id]);
    if (s.rating !== 'green') {
      alerts.push({ worker: fullName(w), detail: s.headline, rating: s.rating });
    }
    const vd = daysUntil(w.visa_expiry);
    void vd;
  }
  alerts.sort((a) => (a.rating === 'red' ? -1 : 1));

  const overall = snapshot?.overall_score ?? 0;
  const overallRating = snapshot?.overall_rating ?? ratingFor(overall);

  if (loading) return <p className="text-sm text-content-muted">Loading dashboard…</p>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-content-strong">Compliance Dashboard</h1>
        <p className="mt-1 text-sm text-content-muted">DL Business Systems Ltd · Sponsor licence compliance overview</p>
      </header>

      {/* Top row: score + counts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`rounded-xl border border-line p-6 shadow-card ${RAG_STYLES[overallRating].bg}`}>
          <p className="text-sm font-medium text-content">DL Compliance Readiness Score</p>
          <div className="mt-2 flex items-end gap-2">
            <span className={`text-5xl font-semibold ${RAG_STYLES[overallRating].text}`}>{overall}</span>
            <span className="mb-1.5 text-content-muted">/ 100</span>
          </div>
          <p className={`mt-1 text-sm font-medium ${RAG_STYLES[overallRating].text}`}>{RAG_STYLES[overallRating].label}</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          <p className="text-sm font-medium text-content">Engaged workers</p>
          <p className="mt-2 text-5xl font-semibold text-content-strong">{workers.length}</p>
          <button onClick={() => navigate('/workers')} className="mt-1 text-sm text-brass-700 hover:underline">
            Open the register
          </button>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          <p className="text-sm font-medium text-content">Open items</p>
          <p className="mt-2 text-5xl font-semibold text-content-strong">{alerts.length}</p>
          <p className="mt-1 text-sm text-content-muted">Needing attention</p>
        </div>
      </section>

      {/* Needs attention */}
      <section>
        <SectionLabel>Needs attention</SectionLabel>
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface px-6 py-8 text-center text-sm text-content-muted">
            Nothing outstanding. Visa dates and follow-up checks are clear.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 shadow-card">
                <span className="text-sm font-medium text-content-strong">{a.worker}</span>
                <StatusPill rating={a.rating} label={a.detail} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Readiness by domain */}
      <section>
        <SectionLabel>Readiness by domain</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CRS_DOMAINS.map((d: CrsDomain) => {
            const score = (snapshot?.[d.key] as number | null) ?? 0;
            const rating = ratingFor(score);
            return (
              <div key={d.key} className="rounded-lg border border-line bg-surface p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-content-strong">{d.label}</p>
                  <span className={`text-sm font-semibold ${RAG_STYLES[rating].text}`}>{score}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper">
                  <div
                    className={`h-full rounded-full ${rating === 'green' ? 'bg-rag-green' : rating === 'amber' ? 'bg-rag-amber' : 'bg-rag-red'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="border-t border-line pt-4 text-xs text-content-muted">
        Internal record-keeping system. Not a substitute for legal advice. The score and alerts recalculate automatically once the nightly engine is live.
      </p>
    </div>
  );
}
