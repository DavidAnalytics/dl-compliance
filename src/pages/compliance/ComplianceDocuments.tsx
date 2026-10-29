import { useEffect, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, Button, EmptyState } from '@/components/ui';
import { fullName, formatDate } from '@/lib/compliance';
import type { Worker, RequiredDocument } from '@/types/database';

// Appendix D standard record-keeping items
const APPENDIX_D: { key: string; label: string }[] = [
  { key: 'right_to_work', label: 'Right to work check evidence (share code / documents)' },
  { key: 'passport_id', label: 'Passport or national identity document' },
  { key: 'cos', label: 'Certificate of Sponsorship details' },
  { key: 'job_description', label: 'Detailed job description' },
  { key: 'qualifications', label: 'Relevant qualifications' },
  { key: 'salary_evidence', label: 'Salary evidence (payslips, proof of payment)' },
  { key: 'ni_number', label: 'National Insurance number' },
  { key: 'employment_rights', label: 'Written statement of employment rights' },
  { key: 'contact_details', label: 'Up-to-date contact details and history' },
  { key: 'absence_record', label: 'Absence record' },
  { key: 'dbs', label: 'DBS check (where the role requires one)' },
];

export function ComplianceDocuments() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [items, setItems] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('workers').select('*').eq('sponsorship_type', 'sponsored').neq('employment_status', 'left').order('last_name');
      const ws = (data as Worker[]) ?? [];
      setWorkers(ws);
      if (ws[0]) setSelected(ws[0].id);
      setLoading(false);
    })();
  }, []);

  async function loadItems(wid: string) {
    const { data } = await supabase.from('required_documents').select('*').eq('worker_id', wid).order('label');
    setItems((data as RequiredDocument[]) ?? []);
  }
  useEffect(() => { if (selected) loadItems(selected); }, [selected]);

  async function setup() {
    await supabase.from('required_documents').insert(APPENDIX_D.map((d) => ({ worker_id: selected, doc_key: d.key, label: d.label, required: true, status: 'missing' })));
    loadItems(selected);
  }
  async function toggle(it: RequiredDocument) {
    await supabase.from('required_documents').update({ status: it.status === 'present' ? 'missing' : 'present' }).eq('id', it.id);
    loadItems(selected);
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (workers.length === 0) return <div><PageHeader title="Documents & Retention" subtitle="Appendix D record-keeping checklist and retention." /><EmptyState title="No sponsored workers" hint="Add a sponsored worker to track their Appendix D records." /></div>;

  const present = items.filter((i) => i.status === 'present').length;

  return (
    <div>
      <PageHeader title="Documents & Retention" subtitle="Appendix D record-keeping checklist, per worker." />
      <div className="mb-4 flex items-center gap-3">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand-300 focus:outline-none">
          {workers.map((w) => <option key={w.id} value={w.id}>{fullName(w)}</option>)}
        </select>
        {items.length > 0 && <span className="text-sm font-semibold text-brand-600">{present}/{items.length} on file</span>}
      </div>

      {items.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">No checklist set up for this worker yet.</p>
          <div className="mt-3"><Button onClick={setup}>Set up Appendix D checklist</Button></div>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 px-5 py-3">
              <button onClick={() => toggle(it)} className={it.status === 'present' ? 'text-rag-green' : 'text-ink-faint hover:text-brand-600'}>
                {it.status === 'present' ? <Check size={18} /> : <Circle size={18} />}
              </button>
              <span className={`flex-1 text-sm ${it.status === 'present' ? 'text-ink' : 'text-ink-muted'}`}>{it.label}</span>
              {it.review_date && <span className="text-xs text-ink-faint">review {formatDate(it.review_date)}</span>}
            </div>
          ))}
        </Card>
      )}

      <p className="mt-4 text-xs text-ink-faint">
        Retention: right to work evidence is kept for the duration of employment plus two years. Other Appendix D records are kept for the sponsorship period plus up to one year.
      </p>
    </div>
  );
}
