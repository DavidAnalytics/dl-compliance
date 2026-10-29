import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui';
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
    <div>
      <PageHeader
        title="Policy Library"
        subtitle="Read-only policies, versioned, with acknowledgement capture. Full policy text is added at the review pass."
      />

      {loading ? (
        <p className="text-sm text-content-muted">Loading policies…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-paper/60 text-left text-xs text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Policy</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Effective</th>
                <th className="px-4 py-3 font-medium">Review due</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-paper">
                  <td className="px-4 py-3 font-medium text-content-strong">{p.title}</td>
                  <td className="px-4 py-3 text-content-muted">{p.version}</td>
                  <td className="px-4 py-3 text-content-muted">{p.effective_date ?? '—'}</td>
                  <td className="px-4 py-3 text-content-muted">{p.review_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.is_published ? 'bg-rag-greenbg text-rag-green' : 'bg-paper text-content-muted'
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
