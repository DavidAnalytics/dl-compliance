import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyWorker } from '@/lib/me';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/compliance';

interface DocRow { id: string; title: string; category: string | null; storage_path: string; created_at: string; }

export function MyDocuments() {
  const { session } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!session) return;
      const w = await fetchMyWorker(session.user.id);
      if (!w) { setLoading(false); return; }
      const { data } = await supabase.from('documents').select('id,title,category,storage_path,created_at').eq('worker_id', w.id).order('created_at', { ascending: false });
      setDocs((data as DocRow[]) ?? []);
      setLoading(false);
    })();
  }, [session]);

  async function download(d: DocRow) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(d.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <div>
      <PageHeader title="My Documents" subtitle="Documents and payslips shared with you." />
      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : docs.length === 0 ? (
        <EmptyState title="No documents yet" hint="Documents HR shares with you will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Added</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {docs.map((d) => (
                <tr key={d.id} className="text-ink-muted">
                  <td className="px-5 py-3 font-medium text-ink">{d.title}</td>
                  <td className="px-5 py-3">{d.category ?? '—'}</td>
                  <td className="px-5 py-3">{formatDate(d.created_at)}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => download(d)} className="rounded-lg p-2 text-ink-faint hover:bg-brand-50 hover:text-brand-600"><Download size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
