import { Construction } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui';

export function ModulePlaceholder({ title, description, phase }: { title: string; description: string; phase: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={description} />
      <Card className="px-6 py-14 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <Construction size={22} />
        </div>
        <p className="text-sm font-semibold text-ink">Coming soon</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
          The data model and navigation for this module are in place. The screens are built out in {phase}.
        </p>
      </Card>
    </div>
  );
}
