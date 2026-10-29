import type { ReactNode } from 'react';
import type { RagRating } from '@/types/database';

// --- Status pill ------------------------------------------------------------
// RAG status is always carried by both colour and text, never colour alone.
const ragPill: Record<RagRating, string> = {
  green: 'bg-rag-greenbg text-rag-green',
  amber: 'bg-rag-amberbg text-rag-amber',
  red: 'bg-rag-redbg text-rag-red',
};

export function StatusPill({ rating, label }: { rating: RagRating; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ragPill[rating]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          rating === 'green' ? 'bg-rag-green' : rating === 'amber' ? 'bg-rag-amber' : 'bg-rag-red'
        }`}
      />
      {label}
    </span>
  );
}

// --- Page header ------------------------------------------------------------
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-content-strong">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-content-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// --- Section label (sentence case, quiet brass rule, not an all-caps eyebrow)
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-3 w-0.5 rounded-full bg-brass" />
      <h2 className="text-sm font-semibold text-content-strong">{children}</h2>
    </div>
  );
}

// --- Button -----------------------------------------------------------------
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  const styles = {
    primary: 'bg-ink text-white hover:bg-ink-700',
    secondary: 'border border-line bg-surface text-content-strong hover:bg-paper',
    ghost: 'text-content hover:bg-paper',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

// --- Monospace code (share codes, SOC, CoS, licence numbers) ----------------
export function Code({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[0.8125rem] text-content-strong">{children}</span>;
}

// --- Empty state ------------------------------------------------------------
export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="text-sm font-medium text-content-strong">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-content-muted">{hint}</p>
    </div>
  );
}
