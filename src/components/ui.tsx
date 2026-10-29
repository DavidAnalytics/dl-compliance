import type { ReactNode } from 'react';
import type { RagRating } from '@/types/database';

// --- Status pill (colour + text, never colour alone) ------------------------
const ragPill: Record<RagRating, string> = {
  green: 'bg-rag-greenbg text-rag-green',
  amber: 'bg-rag-amberbg text-rag-amber',
  red: 'bg-rag-redbg text-rag-red',
};

export function StatusPill({ rating, label }: { rating: RagRating; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ragPill[rating]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${rating === 'green' ? 'bg-rag-green' : rating === 'amber' ? 'bg-rag-amber' : 'bg-rag-red'}`} />
      {label}
    </span>
  );
}

// --- Card -------------------------------------------------------------------
export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

// --- Page header ------------------------------------------------------------
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// --- Section heading --------------------------------------------------------
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}

// --- Button -----------------------------------------------------------------
export function Button({
  children, onClick, type = 'button', variant = 'primary', disabled, size = 'md',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const styles = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
    secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
    ghost: 'text-ink-muted hover:bg-brand-50 hover:text-brand-600',
  }[variant];
  const sizing = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`rounded-xl font-semibold transition disabled:opacity-50 ${sizing} ${styles}`}>
      {children}
    </button>
  );
}

// --- Monospace-ish code token (codes: SOC, CoS, share code) -----------------
export function Code({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[0.8125rem] font-semibold tracking-tight text-brand-700">{children}</span>;
}

// --- Empty state ------------------------------------------------------------
export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <Card className="px-6 py-14 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{hint}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

// --- Avatar (initials) ------------------------------------------------------
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 ${dim}`}>
      {initials || '–'}
    </span>
  );
}
