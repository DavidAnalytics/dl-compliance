import { PageHeader } from '@/components/ui';

interface Props {
  title: string;
  description: string;
  phase: string;
}

export function ModulePlaceholder({ title, description, phase }: Props) {
  return (
    <div>
      <PageHeader title={title} subtitle={description} />
      <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-content-strong">Module scaffolded</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-content-muted">
          The data model, access rules and navigation for this module are in place. The screens are built out in {phase}.
        </p>
      </div>
    </div>
  );
}
