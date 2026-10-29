import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CRS_DOMAINS, ratingFor, RAG_STYLES, type CrsDomain } from '@/lib/crs';
import type { CrsSnapshot, Worker } from '@/types/database';

interface Alert {
  label: string;
  detail: string;
  rating: 'amber' | 'red';
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<CrsSnapshot | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: snap }, { data: w }] = await Promise.all([
        supabase.from('crs_snapshots').select('*').order('captured_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workers').select('*').neq('employment_status', 'left'),
      ]);
      setSnapshot((snap as CrsSnapshot) ?? null);
      setWorkers((w as Worker[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Build a simple alert list from the worker data (visa expiry, follow-ups).
  const alerts: Alert[] = [];
  const today = new Date();
  for (const worker of workers) {
    if (worker.visa_expiry) {
      const expiry = new Date(worker.visa_expiry);
      const days = Math.round((expiry.getTime() - today.getTime()) / 86400000);
      if (days < 0) {
        alerts.push({ label: `${worker.first_name} ${worker.last_name}`, detail: 'Visa has expired', rating: 'red' });
      } else if (days <= 90) {
        alerts.push({ label: `${worker.first_name} ${worker.last_name}`, detail: `Visa expires in ${days} days`, rating: 'amber' });
      }
    }
  }

  const overall = snapshot?.overall_score ?? 0;
  const overallRating = snapshot?.overall_rating ?? ratingFor(overall);

  if (loading) {
    return <p className="text-slate-500">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Compliance Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          DL Business Systems Ltd · Company number 17211065
        </p>
      </header>

      {/* Headline score */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`rounded-xl border border-slate-200 ${RAG_STYLES[overallRating].bg} p-6`}>
          <p className="text-sm font-medium text-slate-600">DL Compliance Readiness Score</p>
          <div className="mt-2 flex items-end gap-2">
            <span className={`text-5xl font-bold ${RAG_STYLES[overallRating].text}`}>{overall}</span>
            <span className="mb-1 text-lg text-slate-400">/ 100</span>
          </div>
          <p className={`mt-1 text-sm font-medium ${RAG_STYLES[overallRating].text}`}>
            {RAG_STYLES[overallRating].label}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-600">Engaged workers</p>
          <p className="mt-2 text-5xl font-bold text-slate-900">{workers.length}</p>
          <p className="mt-1 text-sm text-slate-400">Active and onboarding</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-600">Open alerts</p>
          <p className="mt-2 text-5xl font-bold text-slate-900">{alerts.length}</p>
          <p className="mt-1 text-sm text-slate-400">Needing attention</p>
        </div>
      </section>

      {/* Domain breakdown */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Readiness by domain
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CRS_DOMAINS.map((d: CrsDomain) => {
            const score = (snapshot?.[d.key] as number | null) ?? 0;
            const rating = ratingFor(score);
            return (
              <div key={d.key} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">{d.label}</p>
                  <span className={`text-sm font-semibold ${RAG_STYLES[rating].text}`}>{score}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      rating === 'green' ? 'bg-rag-green' : rating === 'amber' ? 'bg-rag-amber' : 'bg-rag-red'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Alerts */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
            No open alerts. Visa dates and follow-up checks are clear.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li
                key={i}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  a.rating === 'red' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <span className="text-sm font-medium text-slate-800">{a.label}</span>
                <span className={`text-sm ${a.rating === 'red' ? 'text-rag-red' : 'text-rag-amber'}`}>
                  {a.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Internal record-keeping system. Not a substitute for legal advice. Reporting
        thresholds and rules are editable in settings as UKVI guidance changes.
      </p>
    </div>
  );
}
