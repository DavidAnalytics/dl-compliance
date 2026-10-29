interface Props {
  title: string;
  description: string;
  phase: string;
}

export function ModulePlaceholder({ title, description, phase }: Props) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </header>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-slate-600">Module scaffolded</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          The data model, access rules and navigation for this module are in place.
          The screens are built out in {phase}.
        </p>
      </div>
    </div>
  );
}
