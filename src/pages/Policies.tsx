import { useEffect, useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button } from '@/components/ui';
import { formatDate } from '@/lib/compliance';
import type { Policy } from '@/types/database';

const ORG_ID = '00000000-0000-0000-0000-0000000000d1';
const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';

function bumpVersion(v: string): string {
  const m = v.match(/^(\d+)\.(\d+)$/);
  if (!m) return v + '.1';
  return `${m[1]}.${Number(m[2]) + 1}`;
}

export function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [ackCounts, setAckCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Policy | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('policies').select('*').order('title'),
      supabase.from('acknowledgements').select('policy_id, policy_version'),
    ]);
    const pols = (p as Policy[]) ?? [];
    setPolicies(pols);
    const counts: Record<string, number> = {};
    for (const ack of (a as { policy_id: string | null; policy_version: string | null }[]) ?? []) {
      const pol = pols.find((x) => x.id === ack.policy_id);
      if (pol && ack.policy_version === pol.version) counts[pol.id] = (counts[pol.id] ?? 0) + 1;
    }
    setAckCounts(counts);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function onUpload(policy: Policy, file: File) {
    setBusyId(policy.id);
    const nextVersion = policy.file_path ? bumpVersion(policy.version) : policy.version;
    const path = `${ORG_ID}/policies/${policy.slug}-${crypto.randomUUID()}.pdf`;
    const up = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (!up.error) {
      await supabase.from('policies').update({ file_path: path, version: nextVersion }).eq('id', policy.id);
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
      <PageHeader title="Policy Library" subtitle="Company policies, versioned, with a PDF and acknowledgement tracking." />
      {loading ? (
        <p className="text-sm text-ink-muted">Loading policies…</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Policy</th><th className="px-5 py-3">Version</th><th className="px-5 py-3">Effective</th><th className="px-5 py-3">Review</th><th className="px-5 py-3">Acknowledged</th><th className="px-5 py-3">Document</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-canvas/60">
                  <td className="px-5 py-3 font-semibold text-ink">{p.title}</td>
                  <td className="px-5 py-3 text-ink-muted">v{p.version}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(p.effective_date)}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(p.review_date)}</td>
                  <td className="px-5 py-3 text-ink-muted">{ackCounts[p.id] ?? 0}</td>
                  <td className="px-5 py-3">
                    <input ref={(el) => { fileRefs.current[p.id] = el; }} type="file" accept="application/pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(p, f); }} />
                    {p.file_path ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => download(p)} className="inline-flex items-center gap-1.5 rounded-lg bg-rag-greenbg px-2.5 py-1 text-xs font-semibold text-rag-green"><Download size={14} /> View</button>
                        <button onClick={() => fileRefs.current[p.id]?.click()} className="text-xs font-semibold text-brand-600 hover:underline">{busyId === p.id ? '…' : 'Replace'}</button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => fileRefs.current[p.id]?.click()} disabled={busyId === p.id}>
                        <span className="inline-flex items-center gap-1.5"><Upload size={14} /> {busyId === p.id ? 'Uploading…' : 'Upload PDF'}</span>
                      </Button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right"><button onClick={() => setEditing(p)} className="text-xs font-semibold text-brand-600 hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-4 text-xs text-ink-faint">Replacing a PDF bumps the version, which prompts staff to acknowledge the new one.</p>

      {editing && <EditPolicy policy={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditPolicy({ policy, onClose, onSaved }: { policy: Policy; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ version: policy.version, effective_date: policy.effective_date ?? '', review_date: policy.review_date ?? '', is_published: policy.is_published });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    await supabase.from('policies').update({
      version: f.version, effective_date: f.effective_date || null, review_date: f.review_date || null, is_published: f.is_published,
    }).eq('id', policy.id);
    setSaving(false); onSaved();
  }
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">{policy.title}</h2>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Version</label><input className={field} value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Effective date</label><input type="date" className={field} value={f.effective_date} onChange={(e) => setF({ ...f, effective_date: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Review date</label><input type="date" className={field} value={f.review_date} onChange={(e) => setF({ ...f, review_date: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted"><input type="checkbox" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Published (visible to staff)</label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>
      </div>
    </div>
  );
}
