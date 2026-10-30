import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ScrollText, FileText, BadgeCheck, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fullName } from '@/lib/compliance';
import type { AppKey } from '@/config/nav';

interface Hit { id: string; group: string; icon: typeof Users; label: string; sub: string; to: string; }
const esc = (s: string) => s.replace(/[%,]/g, ' ');

export function GlobalSearch({ app }: { app: AppKey }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const workerBase = app === 'hr' ? '/hr/employees' : '/compliance/workers';
  const docBase = app === 'hr' ? '/hr/documents' : '/compliance/documents';

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setOpen(false); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      const like = `%${esc(term)}%`;
      const [w, p, d, r, e] = await Promise.all([
        supabase.from('workers').select('id,first_name,last_name,job_title').or(`first_name.ilike.${like},last_name.ilike.${like},job_title.ilike.${like}`).limit(6),
        supabase.from('policies').select('id,title').ilike('title', like).limit(5),
        supabase.from('documents').select('id,title,category').or(`title.ilike.${like},category.ilike.${like}`).limit(5),
        supabase.from('right_to_work_checks').select('id,share_code,checked_by').or(`share_code.ilike.${like},checked_by.ilike.${like}`).limit(5),
        supabase.from('reportable_events').select('id,event_type,description').or(`event_type.ilike.${like},description.ilike.${like}`).limit(5),
      ]);
      const out: Hit[] = [];
      for (const x of (w.data as { id: string; first_name: string; last_name: string; job_title: string | null }[]) ?? [])
        out.push({ id: x.id, group: 'People', icon: Users, label: fullName(x), sub: x.job_title ?? 'Worker', to: `${workerBase}/${x.id}` });
      for (const x of (p.data as { id: string; title: string }[]) ?? [])
        out.push({ id: x.id, group: 'Policies', icon: ScrollText, label: x.title, sub: 'Policy', to: '/hr/policies' });
      for (const x of (d.data as { id: string; title: string; category: string | null }[]) ?? [])
        out.push({ id: x.id, group: 'Documents', icon: FileText, label: x.title, sub: x.category ?? 'Document', to: docBase });
      for (const x of (r.data as { id: string; share_code: string | null; checked_by: string | null }[]) ?? [])
        out.push({ id: x.id, group: 'Right to work', icon: BadgeCheck, label: x.share_code || 'RTW check', sub: x.checked_by ? `Checked by ${x.checked_by}` : 'Right to work', to: '/compliance/right-to-work' });
      for (const x of (e.data as { id: string; event_type: string; description: string | null }[]) ?? [])
        out.push({ id: x.id, group: 'Reporting', icon: ClipboardList, label: x.event_type.replace(/_/g, ' '), sub: x.description ?? 'Reportable event', to: '/compliance/reporting' });
      setHits(out); setOpen(true); setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, workerBase, docBase]);

  useEffect(() => {
    function onClick(ev: MouseEvent) { if (boxRef.current && !boxRef.current.contains(ev.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(to: string) { setOpen(false); setQ(''); setHits([]); navigate(to); }

  const groups = Array.from(new Set(hits.map((h) => h.group)));

  return (
    <div ref={boxRef} className="relative hidden flex-1 md:block">
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (hits.length) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        placeholder="Search people, policies, documents…"
        className="w-full max-w-md rounded-xl border border-line bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-faint focus:border-brand-300 focus:outline-none"
      />
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 max-w-md overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          {busy && hits.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-muted">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-muted">No matches for “{q.trim()}”.</p>
          ) : (
            <div className="max-h-96 overflow-auto thin-scroll py-1">
              {groups.map((g) => (
                <div key={g}>
                  <p className="px-4 pb-1 pt-2 text-2xs font-bold uppercase tracking-wide text-ink-faint">{g}</p>
                  {hits.filter((h) => h.group === g).map((h) => {
                    const Icon = h.icon;
                    return (
                      <button key={h.group + h.id} onClick={() => go(h.to)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-canvas">
                        <Icon size={16} className="shrink-0 text-ink-faint" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold capitalize text-ink">{h.label}</span>
                          <span className="block truncate text-xs text-ink-faint">{h.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
