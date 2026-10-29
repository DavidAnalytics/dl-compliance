import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Policy } from '@/types/database';

export function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('policies')
        .select('*')
        .order('title', { ascending: true });
      setPolicies((data as Policy[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Policy Library</h1>
        <p className="mt-1 text-sm text-slate-500">
          Read-only policies, versioned, with acknowledgement capture. Full policy
          text is added at the review pass.
        </p>
      </header>

      {loading ? (
        <p className="text-slate-500">Loading policies…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Policy</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Effective</th>
                <th className="px-4 py-3 font-medium">Review due</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.title}</td>
                  <td className="px-4 py-3 text-slate-500">{p.version}</td>
                  <td className="px-4 py-3 text-slate-500">{p.effective_date ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.review_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.is_published ? 'bg-green-50 text-rag-green' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
