// DL Compliance Readiness Score (DL-CRS)
// Six domains, each scored 0-100, combined into a weighted overall score with
// a RAG band. This module is the single source of truth for the model so the
// dashboard and the Phase 2 nightly job compute it identically.

import type { RagRating } from '@/types/database';

export interface CrsDomain {
  key: 'right_to_work' | 'record_keeping' | 'reporting' | 'monitoring' | 'governance' | 'recruitment';
  label: string;
  weight: number; // weights sum to 1
  hint: string; // where the score comes from and what turns it green
}

export const CRS_DOMAINS: CrsDomain[] = [
  {
    key: 'right_to_work',
    label: 'Right to Work & Immigration Status',
    weight: 0.25,
    hint: 'From each sponsored worker’s Right to Work checks and visa expiry. Turns green when every sponsored worker has a passed check on file, the statutory excuse has not lapsed, and no visa has expired. Add or update checks under Right to Work.',
  },
  {
    key: 'record_keeping',
    label: 'Record-Keeping & Documentation',
    weight: 0.2,
    hint: 'From the Appendix D document checklist on each worker. Turns green when every required document is marked present. Upload and tick off documents under a worker’s profile.',
  },
  {
    key: 'reporting',
    label: 'Reporting & SMS Timeliness',
    weight: 0.2,
    hint: 'From reportable events and their SMS deadlines. Turns green when nothing is past its deadline. Log changes and mark them reported under Change Reporting.',
  },
  {
    key: 'monitoring',
    label: 'Monitoring (attendance, absence, expiry)',
    weight: 0.15,
    hint: 'From visa expiry dates and absence records. Turns green when no visa has expired and there are no unresolved reportable absences. Keep absences up to date under Absence Monitoring.',
  },
  {
    key: 'governance',
    label: 'Key Personnel & Governance',
    weight: 0.1,
    hint: 'From the SMS key personnel on record. Turns green when an Authorising Officer, Key Contact and Level 1 User are all named. Set these under Governance.',
  },
  {
    key: 'recruitment',
    label: 'Recruitment & Suitability',
    weight: 0.1,
    hint: 'From each worker’s salary against the SOC going rate and any required DBS check. Turns green when salaries meet the going rate and DBS checks are on file where needed. Edit on the worker’s profile.',
  },
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
  green: { text: 'text-rag-green', bg: 'bg-rag-greenbg', label: 'On track' },
  amber: { text: 'text-rag-amber', bg: 'bg-rag-amberbg', label: 'Needs attention' },
  red: { text: 'text-rag-red', bg: 'bg-rag-redbg', label: 'At risk' },
};
