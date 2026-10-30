import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Megaphone, CalendarHeart, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, Card, Button, EmptyState } from '@/components/ui';
import { Modal, ModalActions } from '@/pages/compliance/ComplianceSettings';
import { formatDate } from '@/lib/compliance';

export interface Announcement {
  id: string; organisation_id: string; type: 'news' | 'event' | 'perk';
  title: string; body: string | null; event_date: string | null; is_published: boolean;
  created_by: string | null; created_at: string;
}

const field = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none';
const labelCls = 'mb-1.5 block text-xs font-semibold text-ink-muted';

export const TYPE_META: Record<Announcement['type'], { label: string; icon: typeof Megaphone; cls: string }> = {
  news: { label: 'News', icon: Megaphone, cls: 'bg-brand-50 text-brand-600' },
  event: { label: 'Event', icon: CalendarHeart, cls: 'bg-rag-amberbg text-rag-amber' },
  perk: { label: 'Perk', icon: Gift, cls: 'bg-rag-greenbg text-rag-green' },
};

export function News() {
  const { session } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Announcement> | null>(null);

  async function load() {
    const [{ data: o }, { data: a }] = await Promise.all([
      supabase.from('organisation').select('id').limit(1).maybeSingle(),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    ]);
    setOrgId((o as { id: string } | null)?.id ?? '');
    setItems((a as Announcement[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) { await supabase.from('announcements').delete().eq('id', id); load(); }
  async function togglePublish(a: Announcement) { await supabase.from('announcements').update({ is_published: !a.is_published }).eq('id', a.id); load(); }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="News & Events" subtitle="Post news, events and perks for the team. Published posts appear on everyone's overview."
        actions={<Button onClick={() => setEdit({})}><span className="inline-flex items-center gap-1.5"><Plus size={16} /> New post</span></Button>} />

      {items.length === 0 ? (
        <EmptyState title="Nothing posted yet" hint="Share a company update, an upcoming event or a team perk." />
      ) : (
        <div className="space-y-4">
          {items.map((a) => {
            const meta = TYPE_META[a.type]; const Icon = meta.icon;
            return (
              <Card key={a.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.cls}`}><Icon size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink">{a.title}</p>
                      {!a.is_published && <span className="rounded-full bg-canvas px-2 py-0.5 text-2xs font-semibold text-ink-faint">Draft</span>}
                    </div>
                    <p className="text-2xs font-semibold uppercase tracking-wide text-ink-faint">{meta.label}{a.event_date ? ` · ${formatDate(a.event_date)}` : ''}</p>
                    {a.body && <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-muted">{a.body}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => togglePublish(a)} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-canvas">{a.is_published ? 'Unpublish' : 'Publish'}</button>
                    <button onClick={() => setEdit(a)} className="rounded-lg p-2 text-ink-faint hover:text-brand-600" aria-label="Edit"><Pencil size={16} /></button>
                    <button onClick={() => remove(a.id)} className="rounded-lg p-2 text-ink-faint hover:text-rag-red" aria-label="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {edit && <PostModal post={edit} orgId={orgId} userId={session?.user.id ?? null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function PostModal({ post, orgId, userId, onClose, onSaved }: { post: Partial<Announcement>; orgId: string; userId: string | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<Announcement>>({ type: 'news', is_published: true, ...post });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const payload = { organisation_id: orgId, type: f.type, title: f.title, body: f.body || null, event_date: f.event_date || null, is_published: f.is_published ?? true };
    if (post.id) await supabase.from('announcements').update(payload).eq('id', post.id);
    else await supabase.from('announcements').insert({ ...payload, created_by: userId });
    setSaving(false); onSaved();
  }
  return (
    <Modal title={post.id ? 'Edit post' : 'New post'} onClose={onClose}>
      <div className="space-y-3">
        <div><label className={labelCls}>Type</label>
          <select className={field} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Announcement['type'] })}>
            <option value="news">News</option><option value="event">Event</option><option value="perk">Perk</option>
          </select>
        </div>
        <div><label className={labelCls}>Title</label><input className={field} value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        {f.type === 'event' && <div><label className={labelCls}>Event date</label><input type="date" className={field} value={f.event_date ?? ''} onChange={(e) => setF({ ...f, event_date: e.target.value })} /></div>}
        <div><label className={labelCls}>Details</label><textarea rows={4} className={field} value={f.body ?? ''} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm text-ink-muted"><input type="checkbox" checked={f.is_published ?? true} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Publish now (visible to the team)</label>
      </div>
      <ModalActions onClose={onClose} onSave={save} saving={saving} disabled={!f.title} />
    </Modal>
  );
}
