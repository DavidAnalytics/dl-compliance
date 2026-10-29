import { useEffect, useState } from 'react';
import { Download, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyWorker } from '@/lib/me';
import { PageHeader, Card, Button } from '@/components/ui';
import type { Policy } from '@/types/database';

interface Ack { policy_id: string | null; policy_version: string | null; }

export function MyPolicies() {
  const { session } = useAuth();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [acks, setAcks] = useState<Ack[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session) return;
    const w = await fetchMyWorker(session.user.id);
    setWorkerId(w?.id ?? null);
    const [{ data: p }, ackRes] = await Promise.all([
      supabase.from('policies').select('*').eq('is_published', true).order('title'),
      w ? supabase.from('acknowledgements').select('policy_id,policy_version').eq('worker_id', w.id) : Promise.resolve({ data: [] }),
    ]);
    setPolicies((p as Policy[]) ?? []);
    setAcks((ackRes.data as Ack[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [session]);

  function ackState(p: Policy): 'current' | 'outdated' | 'none' {
    const mine = acks.filter((a) => a.policy_id === p.id);
    if (mine.length === 0) return 'none';
    return mine.some((a) => a.policy_version === p.version) ? 'current' : 'outdated';
  }

  async function view(p: Policy) {
    if (!p.file_path) return;
    const { data } = await supabase.storage.from('documents').createSignedUrl(p.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }
  async function acknowledge(p: Policy) {
    if (!workerId) return;
    await supabase.from('acknowledgements').insert({ worker_id: workerId, policy_id: p.id, policy_version: p.version });
    load();
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div>
      <PageHeader title="Policies" subtitle="Read each policy and confirm you have read it." />
      <Card className="divide-y divide-line">
        {policies.map((p) => {
          const state = ackState(p);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{p.title} <span className="font-normal text-ink-faint">v{p.version}</span></p>
                {state === 'outdated' && <p className="text-xs text-rag-amber">Updated since you last acknowledged. Please read and confirm again.</p>}
              </div>
              {p.file_path && <button onClick={() => view(p)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink"><Download size={14} /> View</button>}
              {state === 'current' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rag-greenbg px-3 py-1.5 text-xs font-semibold text-rag-green"><Check size={14} /> Acknowledged</span>
              ) : (
                <Button size="sm" onClick={() => acknowledge(p)}>{state === 'outdated' ? 'Re-acknowledge' : 'Acknowledge'}</Button>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
