// DL Compliance Readiness Score (DL-CRS)
// Six domains, each scored 0-100, combined into a weighted overall score with
// a RAG band. This module is the single source of truth for the model so the
// dashboard and the Phase 2 nightly job compute it identically.

import type { RagRating } from '@/types/database';

export interface CrsDomain {
  key: 'right_to_work' | 'record_keeping' | 'reporting' | 'monitoring' | 'governance' | 'recruitment';
  label: string;
  weight: number; // weights sum to 1
}

export const CRS_DOMAINS: CrsDomain[] = [
  { key: 'right_to_work', label: 'Right to Work & Immigration Status', weight: 0.25 },
  { key: 'record_keeping', label: 'Record-Keeping & Documentation', weight: 0.2 },
  { key: 'reporting', label: 'Reporting & SMS Timeliness', weight: 0.2 },
  { key: 'monitoring', label: 'Monitoring (attendance, absence, expiry)', weight: 0.15 },
  { key: 'governance', label: 'Key Personnel & Governance', weight: 0.1 },
  { key: 'recruitment', label: 'Recruitment & Suitability', weight: 0.1 },
];

export function ratingFor(score: number): RagRating {
  if (score >= 85) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
}

export function overallScore(domainScores: Record<CrsDomain['key'], number>): number {
  const total = CRS_DOMAINS.reduce(
    (acc, d) => acc + (domainScores[d.key] ?? 0) * d.weight,
    0
  );
  return Math.round(total);
}

export const RAG_STYLES: Record<RagRating, { text: string; bg: string; label: string }> = {
  green: { text: 'text-rag-green', bg: 'bg-green-50', label: 'On track' },
  amber: { text: 'text-rag-amber', bg: 'bg-amber-50', label: 'Needs attention' },
  red: { text: 'text-rag-red', bg: 'bg-red-50', label: 'At risk' },
};
