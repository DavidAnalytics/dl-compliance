import { useEffect, useRef, useState } from 'react';
import { Upload, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, Card, Button, EmptyState } from '@/components/ui';
import { fullName, formatDate, daysUntil } from '@/lib/compliance';
import type { Worker } from '@/types/database';

const ORG_ID = '00000000-0000-0000-0000-0000000000d1';
const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const CATEGORIES = ['Contract', 'Offer letter', 'Handbook', 'Policy', 'ID', 'Passport', 'National Insurance', 'Visa / BRP', 'Right to work', 'DBS', 'Other'];

interface DocRow {
  id: string; title: string; category: string | null; worker_id: string | null;
  storage_path: string; retention_until: string | null; created_at: string;
}

export function Documents() {
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', category: 'Contract', worker_id: '', expiry: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [{ data: d }, { data: w }] = await Promise.all([
      supabase.from('documents').select('id,title,category,worker_id,storage_path,retention_until,created_at').order('created_at', { ascending: false }),
      supabase.from('workers').select('*'),
    ]);
    setDocs((d as DocRow[]) ?? []);
    setWorkers((w as Worker[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const nameOf = (wid: string | null) => { if (!wid) return '—'; const w = workers.find((x) => x.id === wid); return w ? fullName(w) : '—'; };

  async function upload() {
    setError(null);
    if (!file) { setError('Choose a file first.'); return; }
    setUploading(true);
    const path = `${ORG_ID}/${crypto.randomUUID()}-${file.name}`;
    const up = await supabase.storage.from('documents').upload(path, file);
    if (up.error) { setError(up.error.message); setUploading(false); return; }
    const ins = await supabase.from('documents').insert({
      organisation_id: ORG_ID, worker_id: form.worker_id || null,
      title: form.title || file.name, category: form.category,
      storage_path: path, mime_type: file.type, file_size: file.size,
      uploaded_by: session?.user.id ?? null, retention_until: form.expiry || null,
    });
    setUploading(false);
    if (ins.error) { setError(ins.error.message); return; }
    setForm({ title: '', category: 'Contract', worker_id: '', expiry: '' });
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    load();
  }

  async function download(d: DocRow) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(d.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }
  async function remove(d: DocRow) {
    await supabase.storage.from('documents').remove([d.storage_path]);
    await supabase.from('documents').delete().eq('id', d.id);
    load();
  }

  return (
    <div>
      <PageHeader title="Documents" subtitle="Contracts, offer letters and HR documents, held securely with expiry reminders." />

      <Card className="mb-6 p-5">
        <p className="mb-3 text-sm font-bold text-ink">Upload a document</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">File</label>
            <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-600" />
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Title</label><input className={field} placeholder="Defaults to file name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Category</label>
            <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Employee (optional)</label>
            <select className={field} value={form.worker_id} onChange={(e) => setForm({ ...form, worker_id: e.target.value })}><option value="">Company-wide</option>{workers.map((w) => <option key={w.id} value={w.id}>{fullName(w)}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-ink-muted">Expiry / review date (optional)</label><input type="date" className={field} value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} /></div>
        </div>
        {error && <p className="mt-2 text-sm text-rag-red">{error}</p>}
        <div className="mt-3"><Button onClick={upload} disabled={uploading}><span className="inline-flex items-center gap-1.5"><Upload size={16} /> {uploading ? 'Uploading…' : 'Upload'}</span></Button></div>
      </Card>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : docs.length === 0 ? (
        <EmptyState title="No documents yet" hint="Upload your first document above." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas/50 text-left text-xs font-semibold text-ink-faint">
              <tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">Added</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {docs.map((d) => {
                const dd = daysUntil(d.retention_until);
                const expFlag = dd === null ? null : dd < 0 ? 'expired' : dd <= 30 ? 'soon' : null;
                return (
                  <tr key={d.id} className="text-ink-muted">
                    <td className="px-5 py-3 font-medium text-ink">{d.title}</td>
                    <td className="px-5 py-3">{d.category ?? '—'}</td>
                    <td className="px-5 py-3">{nameOf(d.worker_id)}</td>
                    <td className="px-5 py-3">
                      {d.retention_until ? (
                        <span className={expFlag === 'expired' ? 'font-semibold text-rag-red' : expFlag === 'soon' ? 'font-semibold text-rag-amber' : ''}>
                          {formatDate(d.retention_until)}{expFlag === 'expired' ? ' · expired' : expFlag === 'soon' ? ` · ${dd}d` : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">{formatDate(d.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => download(d)} className="rounded-lg p-2 text-ink-faint hover:bg-brand-50 hover:text-brand-600" title="Download"><Download size={16} /></button>
                        <button onClick={() => remove(d)} className="rounded-lg p-2 text-ink-faint hover:bg-rag-redbg hover:text-rag-red" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
