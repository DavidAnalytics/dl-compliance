import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card } from '@/components/ui';
import { formatDate } from '@/lib/compliance';
import type { Policy } from '@/types/database';

export function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('policies').select('*').order('title');
      setPolicies((data as Policy[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Policy Library" subtitle="Read-only policies, versioned, with acknowledgement capture. Full policy text is added at the review pass." />
      {loading ? (
        <p className="text-sm text-ink-muted">Loading policies…</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Policy</th><th className="px-5 py-3">Version</th><th className="px-5 py-3">Effective</th><th className="px-5 py-3">Review due</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-canvas/60">
                  <td className="px-5 py-3 font-semibold text-ink">{p.title}</td>
                  <td className="px-5 py-3 text-ink-muted">{p.version}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(p.effective_date)}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(p.review_date)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.is_published ? 'bg-rag-greenbg text-rag-green' : 'bg-canvas text-ink-faint'}`}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
