import { useEffect, useState } from 'react';
import { Plus, Check, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, EmptyState, Avatar } from '@/components/ui';
import { fullName } from '@/lib/compliance';
import type { Worker, OnboardingTask } from '@/types/database';

const DEFAULT_TASKS: { title: string; category: string }[] = [
  { title: 'Right to work check completed', category: 'rtw' },
  { title: 'Signed contract on file', category: 'document' },
  { title: 'Equipment issued', category: 'equipment' },
  { title: 'IT accounts set up', category: 'equipment' },
  { title: 'Induction completed', category: 'induction' },
  { title: 'Training assigned', category: 'training' },
  { title: 'Added to FreeAgent payroll', category: 'admin' },
  { title: 'Emergency contact on file', category: 'document' },
];

export function Onboarding() {
  const [starters, setStarters] = useState<Worker[]>([]);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  async function load() {
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from('workers').select('*').eq('employment_status', 'onboarding').order('start_date'),
      supabase.from('onboarding_tasks').select('*').order('created_at'),
    ]);
    setStarters((w as Worker[]) ?? []);
    setTasks((t as OnboardingTask[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function seedDefault(workerId: string) {
    await supabase.from('onboarding_tasks').insert(DEFAULT_TASKS.map((t) => ({ worker_id: workerId, title: t.title, category: t.category })));
    load();
  }
  async function toggle(task: OnboardingTask) {
    await supabase.from('onboarding_tasks').update({ status: task.status === 'done' ? 'pending' : 'done' }).eq('id', task.id);
    load();
  }
  async function addTask(workerId: string) {
    if (!newTitle.trim()) return;
    await supabase.from('onboarding_tasks').insert({ worker_id: workerId, title: newTitle });
    setNewTitle(''); setAdding(null); load();
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div>
      <PageHeader title="Onboarding" subtitle="New starters and their checklists." />
      {starters.length === 0 ? (
        <EmptyState title="No one is onboarding" hint="Employees with an onboarding status appear here with their checklist." />
      ) : (
        <div className="space-y-5">
          {starters.map((w) => {
            const wt = tasks.filter((t) => t.worker_id === w.id);
            const done = wt.filter((t) => t.status === 'done').length;
            const pct = wt.length ? Math.round((done / wt.length) * 100) : 0;
            return (
              <Card key={w.id} className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={fullName(w)} />
                    <div>
                      <p className="font-bold text-ink">{fullName(w)}</p>
                      <p className="text-xs text-ink-faint">{w.job_title ?? 'Role not set'}</p>
                    </div>
                  </div>
                  {wt.length > 0 && <span className="text-sm font-semibold text-brand-600">{done}/{wt.length} done</span>}
                </div>

                {wt.length === 0 ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-ink-muted">No checklist yet.</p>
                    <Button size="sm" onClick={() => seedDefault(w.id)}>Create default checklist</Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-canvas">
                      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                    </div>
                    <ul className="space-y-1.5">
                      {wt.map((t) => (
                        <li key={t.id} className="flex items-center gap-2.5">
                          <button onClick={() => toggle(t)} className={t.status === 'done' ? 'text-rag-green' : 'text-ink-faint hover:text-brand-600'}>
                            {t.status === 'done' ? <Check size={18} /> : <Circle size={18} />}
                          </button>
                          <span className={`text-sm ${t.status === 'done' ? 'text-ink-faint line-through' : 'text-ink'}`}>{t.title}</span>
                          {t.category && <span className="rounded-full bg-canvas px-2 py-0.5 text-2xs capitalize text-ink-faint">{t.category}</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      {adding === w.id ? (
                        <div className="flex gap-2">
                          <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New task"
                            className="flex-1 rounded-lg border border-line px-3 py-1.5 text-sm" onKeyDown={(e) => e.key === 'Enter' && addTask(w.id)} />
                          <Button size="sm" onClick={() => addTask(w.id)}>Add</Button>
                        </div>
                      ) : (
                        <button onClick={() => setAdding(w.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600"><Plus size={15} /> Add task</button>
                      )}
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
