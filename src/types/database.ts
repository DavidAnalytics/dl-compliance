// Hand-written types mirroring the Postgres schema (migration 0001).
// Once the stack is deployed you can regenerate these from the live database
// with: npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type AppRole = 'admin' | 'authorising_officer' | 'hr' | 'viewer' | 'worker';
export type SmsRole = 'authorising_officer' | 'key_contact' | 'level_1_user' | 'level_2_user';
export type EmploymentStatus = 'active' | 'onboarding' | 'suspended' | 'left';
export type SponsorshipType = 'sponsored' | 'settled' | 'british_irish' | 'other';
export type RtwMethod = 'online_share_code' | 'manual_document' | 'idvt';
export type RtwOutcome = 'pass_continuous' | 'pass_time_limited' | 'fail' | 'pending';
export type AbsenceType = 'holiday' | 'sickness' | 'unpaid' | 'parental' | 'compassionate' | 'other';
export type DbsLevel = 'basic' | 'standard' | 'enhanced' | 'enhanced_barred';
export type ReportStatus = 'due' | 'reported' | 'not_required' | 'overdue';
export type RagRating = 'green' | 'amber' | 'red';
export type ExcuseType = 'continuous' | 'time_limited' | 'six_month' | 'none';
export type DocStatus = 'present' | 'missing' | 'expiring' | 'expired';
export type AlertType =
  | 'visa_expiry' | 'rtw_follow_up' | 'dbs_renewal' | 'document_expiry'
  | 'reporting_deadline' | 'review_due' | 'sms_login_stale' | 'salary_shortfall'
  | 'role_review_due' | 'unexplained_absence';
export type AlertSeverity = 'info' | 'amber' | 'red';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export interface Organisation {
  id: string;
  legal_name: string;
  company_number: string;
  sponsor_licence_no: string | null;
  licence_rating: string | null;
  licence_route: string | null;
  licence_expiry: string | null;
  default_soc_code: string | null;
  registered_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  organisation_id: string;
  app_user_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  personal_email: string | null;
  personal_phone: string | null;
  home_address: string | null;
  job_title: string | null;
  soc_code: string | null;
  annual_salary: number | null;
  start_date: string | null;
  end_date: string | null;
  work_location: string | null;
  employment_status: EmploymentStatus;
  sponsorship_type: SponsorshipType;
  cos_reference: string | null;
  visa_type: string | null;
  visa_start: string | null;
  visa_expiry: string | null;
  requires_dbs: boolean;
  created_at: string;
  updated_at: string;
}

export interface RightToWorkCheck {
  id: string;
  worker_id: string;
  method: RtwMethod;
  share_code: string | null;
  checked_on: string;
  checked_by: string | null;
  outcome: RtwOutcome;
  follow_up_due: string | null;
  excuse_type: ExcuseType;
  excuse_expiry: string | null;
  document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Absence {
  id: string;
  worker_id: string;
  absence_type: AbsenceType;
  start_date: string;
  end_date: string;
  working_days: number | null;
  is_unauthorised: boolean;
  reportable: boolean;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  organisation_id: string;
  title: string;
  slug: string;
  body: string | null;
  version: string;
  effective_date: string | null;
  review_date: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrsSnapshot {
  id: string;
  organisation_id: string;
  captured_at: string;
  overall_score: number;
  overall_rating: RagRating;
  right_to_work: number | null;
  record_keeping: number | null;
  reporting: number | null;
  monitoring: number | null;
  governance: number | null;
  recruitment: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface KeyPersonnel {
  id: string;
  organisation_id: string;
  full_name: string;
  sms_role: SmsRole;
  email: string | null;
  phone: string | null;
  appointed_on: string | null;
  last_sms_login: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  organisation_id: string;
  worker_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  detail: string | null;
  due_date: string | null;
  days_out: number | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequiredDocument {
  id: string;
  worker_id: string;
  doc_key: string;
  label: string;
  required: boolean;
  status: DocStatus;
  document_id: string | null;
  expiry_date: string | null;
  review_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactHistory {
  id: string;
  worker_id: string;
  field: string;
  value: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

export interface PayPeriod {
  id: string;
  worker_id: string;
  period_start: string;
  period_end: string;
  gross_paid: number | null;
  hours: number | null;
  payslip_document_id: string | null;
  meets_going_rate: boolean | null;
  shortfall: number | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocGoingRate {
  id: string;
  soc_code: string;
  occupation: string;
  going_rate_annual: number | null;
  hourly_rate: number | null;
  effective_from: string | null;
  source_note: string | null;
}
