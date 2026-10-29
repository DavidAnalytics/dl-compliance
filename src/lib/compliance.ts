// Worker-level compliance derivation, shared by the register and the profile.
// Keeps the status logic in one place so the list and the detail view agree.

import type { RagRating, Worker, RightToWorkCheck } from '@/types/database';

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export interface WorkerStatus {
  rating: RagRating;
  headline: string; // the single most urgent thing to say
}

// Derive an overall RAG and the most pressing message for a worker.
export function workerStatus(worker: Worker, latestRtw?: RightToWorkCheck | null): WorkerStatus {
  // Settled / British or Irish workers carry far lighter duties.
  const sponsored = worker.sponsorship_type === 'sponsored';

  const visaDays = daysUntil(worker.visa_expiry);
  const excuseDays = daysUntil(latestRtw?.excuse_expiry ?? latestRtw?.follow_up_due ?? null);

  // Red conditions
  if (sponsored && visaDays !== null && visaDays < 0) {
    return { rating: 'red', headline: 'Visa expired' };
  }
  if (sponsored && !latestRtw) {
    return { rating: 'red', headline: 'No right to work check on file' };
  }
  if (latestRtw?.outcome === 'fail') {
    return { rating: 'red', headline: 'Right to work check failed' };
  }
  if (excuseDays !== null && excuseDays < 0) {
    return { rating: 'red', headline: 'Statutory excuse lapsed, follow-up overdue' };
  }

  // Amber conditions
  if (sponsored && visaDays !== null && visaDays <= 90) {
    return { rating: 'amber', headline: `Visa expires in ${visaDays} days` };
  }
  if (excuseDays !== null && excuseDays <= 90) {
    return { rating: 'amber', headline: `Follow-up check due in ${excuseDays} days` };
  }
  if (worker.employment_status === 'onboarding') {
    return { rating: 'amber', headline: 'Onboarding in progress' };
  }

  return { rating: 'green', headline: 'Compliant' };
}

export function fullName(worker: Pick<Worker, 'first_name' | 'last_name'>): string {
  return `${worker.first_name} ${worker.last_name}`.trim();
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}
