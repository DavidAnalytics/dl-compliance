import { useEffect, useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button } from '@/components/ui';
import { formatDate } from '@/lib/compliance';
import type { Policy } from '@/types/database';

const ORG_ID = '00000000-0000-0000-0000-0000000000d1';

export function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    const { data } = await supabase.from('policies').select('*').order('title');
    setPolicies((data as Policy[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function onUpload(policy: Policy, file: File) {
    setBusyId(policy.id);
    const path = `${ORG_ID}/policies/${policy.slug}-${crypto.randomUUID()}.pdf`;
    const up = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (!up.error) {
      await supabase.from('policies').update({ file_path: path }).eq('id', policy.id);
    }
    setBusyId(null);
    load();
  }
  async function download(policy: Policy) {
    if (!policy.file_path) return;
    const { data } = await supabase.storage.from('documents').createSignedUrl(policy.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <div>
      <PageHeader title="Policy Library" subtitle="Company policies, versioned, with a PDF attached to each for staff to read and acknowledge." />
      {loading ? (
        <p className="text-sm text-ink-muted">Loading policies…</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Policy</th><th className="px-5 py-3">Version</th><th className="px-5 py-3">Effective</th><th className="px-5 py-3">Review due</th><th className="px-5 py-3">Document</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-canvas/60">
                  <td className="px-5 py-3 font-semibold text-ink">{p.title}</td>
                  <td className="px-5 py-3 text-ink-muted">{p.version}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(p.effective_date)}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(p.review_date)}</td>
                  <td className="px-5 py-3">
                    <input ref={(el) => { fileRefs.current[p.id] = el; }} type="file" accept="application/pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(p, f); }} />
                    {p.file_path ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => download(p)} className="inline-flex items-center gap-1.5 rounded-lg bg-rag-greenbg px-2.5 py-1 text-xs font-semibold text-rag-green"><Download size={14} /> View PDF</button>
                        <button onClick={() => fileRefs.current[p.id]?.click()} className="text-xs font-semibold text-brand-600 hover:underline">Replace</button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => fileRefs.current[p.id]?.click()} disabled={busyId === p.id}>
                        <span className="inline-flex items-center gap-1.5"><Upload size={14} /> {busyId === p.id ? 'Uploading…' : 'Upload PDF'}</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-4 text-xs text-ink-faint">Upload each policy as a PDF. Staff acknowledgement capture attaches to these records.</p>
    </div>
  );
}
