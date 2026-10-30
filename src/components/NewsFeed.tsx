import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, SectionLabel } from '@/components/ui';
import { formatDate } from '@/lib/compliance';
import { TYPE_META, type Announcement } from '@/pages/hr/News';

export function NewsFeed({ limit = 4 }: { limit?: number }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(limit)
      .then(({ data }) => { setItems((data as Announcement[]) ?? []); setLoaded(true); });
  }, [limit]);

  if (!loaded || items.length === 0) return null;

  return (
    <Card className="p-6">
      <SectionLabel>News &amp; events</SectionLabel>
      <ul className="mt-2 divide-y divide-line">
        {items.map((a) => {
          const meta = TYPE_META[a.type]; const Icon = meta.icon;
          return (
            <li key={a.id} className="flex items-start gap-3 py-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.cls}`}><Icon size={17} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{a.title}</p>
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-faint">{meta.label}{a.event_date ? ` · ${formatDate(a.event_date)}` : ''}</p>
                {a.body && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-ink-muted">{a.body}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
