-- ============================================================================
-- DL Business Systems Ltd — People & Sponsor Compliance platform
-- Migration 0001: core schema, enums, helper functions, triggers
-- Target: Supabase Postgres, London (eu-west-2) region
-- ============================================================================
-- Run order: 0001_init.sql, then 0002_rls.sql, then 0003_seed.sql
-- All application tables live in the `public` schema.
-- Auth is handled by Supabase `auth.users`; `app_users` extends it.
-- ============================================================================

-- --- Extensions -------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- --- Enumerated types -------------------------------------------------------
-- Application roles. Governs access through RLS (see 0002_rls.sql).
create type app_role as enum ('admin', 'authorising_officer', 'hr', 'viewer', 'worker');

-- UKVI Sponsor Management System key personnel roles.
create type sms_role as enum ('authorising_officer', 'key_contact', 'level_1_user', 'level_2_user');

-- Worker employment status.
create type employment_status as enum ('active', 'onboarding', 'suspended', 'left');

-- Whether a worker is sponsored under the licence.
create type sponsorship_type as enum ('sponsored', 'settled', 'british_irish', 'other');

-- Right to work check method (2026 methods).
create type rtw_method as enum ('online_share_code', 'manual_document', 'idvt');

-- Right to work check outcome.
create type rtw_outcome as enum ('pass_continuous', 'pass_time_limited', 'fail', 'pending');

-- Absence categories. UKVI-relevant absence is flagged separately via is_unauthorised.
create type absence_type as enum ('holiday', 'sickness', 'unpaid', 'parental', 'compassionate', 'other');

-- DBS certificate level.
create type dbs_level as enum ('basic', 'standard', 'enhanced', 'enhanced_barred');

-- Reportable event status in the SMS reporting workflow.
create type report_status as enum ('due', 'reported', 'not_required', 'overdue');

-- RAG rating used by the DL Compliance Readiness Score.
create type rag_rating as enum ('green', 'amber', 'red');

-- --- updated_at trigger helper ----------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- organisation: single-row table holding the sponsor licence details
-- ============================================================================
create table organisation (
  id                uuid primary key default gen_random_uuid(),
  legal_name        text not null default 'DL Business Systems Ltd',
  company_number    text not null default '17211065',
  sponsor_licence_no text,
  licence_rating    text default 'A',
  licence_route     text default 'Skilled Worker',
  licence_expiry    date,
  default_soc_code  text,
  registered_address text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_organisation_updated
  before update on organisation
  for each row execute function set_updated_at();

-- ============================================================================
-- app_users: application accounts, extends Supabase auth.users
-- id matches auth.users.id exactly
-- ============================================================================
create table app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        app_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_app_users_updated
  before update on app_users
  for each row execute function set_updated_at();

-- Convenience: does the current auth user hold one of the given roles?
create or replace function current_user_has_role(roles app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_users
    where id = auth.uid()
      and is_active
      and role = any(roles)
  );
$$;

-- Is the current user an authenticated, active app user at all?
create or replace function is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_users where id = auth.uid() and is_active
  );
$$;

-- ============================================================================
-- key_personnel: UKVI SMS roles (AO, Key Contact, Level 1/2)
-- ============================================================================
create table key_personnel (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id) on delete cascade,
  full_name       text not null,
  sms_role        sms_role not null,
  email           text,
  phone           text,
  appointed_on    date,
  last_sms_login  date,          -- SMS accounts are removed after 12 months inactive
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_key_personnel_updated
  before update on key_personnel
  for each row execute function set_updated_at();

-- ============================================================================
-- workers: the engaged workers register (HR + immigration record)
-- ============================================================================
create table workers (
  id                 uuid primary key default gen_random_uuid(),
  organisation_id    uuid not null references organisation(id) on delete cascade,
  -- optional link to an app login, for worker self-service in a later phase
  app_user_id        uuid references app_users(id) on delete set null,

  -- Personal
  first_name         text not null,
  last_name          text not null,
  date_of_birth      date,
  nationality        text,
  personal_email     text,
  personal_phone     text,
  home_address       text,

  -- Employment
  job_title          text,
  soc_code           text,
  annual_salary      numeric(12,2),
  start_date         date,
  end_date           date,
  work_location      text,         -- must match what is reported to UKVI
  employment_status  employment_status not null default 'onboarding',

  -- Immigration / sponsorship
  sponsorship_type   sponsorship_type not null default 'sponsored',
  cos_reference      text,         -- Certificate of Sponsorship reference
  visa_type          text,
  visa_start         date,
  visa_expiry        date,
  requires_dbs       boolean not null default false,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_workers_org on workers(organisation_id);
create index idx_workers_status on workers(employment_status);
create index idx_workers_visa_expiry on workers(visa_expiry);

create trigger trg_workers_updated
  before update on workers
  for each row execute function set_updated_at();

-- ============================================================================
-- right_to_work_checks: log of each RTW check performed
-- ============================================================================
create table right_to_work_checks (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid not null references workers(id) on delete cascade,
  method          rtw_method not null,
  share_code      text,
  checked_on      date not null,
  checked_by      text,
  outcome         rtw_outcome not null default 'pending',
  -- for time-limited leave, the date the statutory excuse expires and a
  -- follow-up check is required
  follow_up_due   date,
  document_id     uuid,            -- evidence, FK added after documents table
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_rtw_worker on right_to_work_checks(worker_id);
create index idx_rtw_followup on right_to_work_checks(follow_up_due);

create trigger trg_rtw_updated
  before update on right_to_work_checks
  for each row execute function set_updated_at();

-- ============================================================================
-- absences: HR leave + UKVI absence monitoring in one table
-- ============================================================================
create table absences (
  id                uuid primary key default gen_random_uuid(),
  worker_id         uuid not null references workers(id) on delete cascade,
  absence_type      absence_type not null,
  start_date        date not null,
  end_date          date not null,
  working_days      numeric(5,1),   -- computed/entered working days in the period
  is_unauthorised   boolean not null default false,
  -- UKVI: absence over 10 consecutive working days without permission is reportable
  reportable        boolean not null default false,
  reason            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint chk_absence_dates check (end_date >= start_date)
);

create index idx_absences_worker on absences(worker_id);

create trigger trg_absences_updated
  before update on absences
  for each row execute function set_updated_at();

-- ============================================================================
-- policies: read-only policy library, versioned
-- ============================================================================
create table policies (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id) on delete cascade,
  title           text not null,
  slug            text not null,
  body            text,            -- policy text (markdown)
  version         text not null default '1.0',
  effective_date  date,
  review_date     date,
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisation_id, slug, version)
);

create trigger trg_policies_updated
  before update on policies
  for each row execute function set_updated_at();

-- ============================================================================
-- documents: file metadata; files themselves live in Supabase Storage
-- ============================================================================
create table documents (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id) on delete cascade,
  worker_id       uuid references workers(id) on delete cascade,
  title           text not null,
  category        text,            -- e.g. 'right_to_work', 'contract', 'cos', 'dbs'
  storage_path    text not null,   -- path within the private Storage bucket
  mime_type       text,
  file_size       integer,
  uploaded_by     uuid references app_users(id) on delete set null,
  retention_until date,            -- Appendix D retention date
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_documents_worker on documents(worker_id);
create index idx_documents_retention on documents(retention_until);

create trigger trg_documents_updated
  before update on documents
  for each row execute function set_updated_at();

-- Now wire the RTW evidence FK (documents exists now)
alter table right_to_work_checks
  add constraint fk_rtw_document
  foreign key (document_id) references documents(id) on delete set null;

-- ============================================================================
-- acknowledgements: worker sign-off on a policy or document
-- ============================================================================
create table acknowledgements (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid not null references workers(id) on delete cascade,
  policy_id       uuid references policies(id) on delete cascade,
  document_id     uuid references documents(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  method          text default 'in_app',
  created_at      timestamptz not null default now(),
  constraint chk_ack_target check (policy_id is not null or document_id is not null)
);

create index idx_ack_worker on acknowledgements(worker_id);

-- ============================================================================
-- dbs_checks: DBS tracking for regulated roles
-- ============================================================================
create table dbs_checks (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid not null references workers(id) on delete cascade,
  level           dbs_level not null,
  certificate_no  text,
  issue_date      date,
  renewal_due     date,
  on_update_service boolean not null default false,
  document_id     uuid references documents(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_dbs_worker on dbs_checks(worker_id);

create trigger trg_dbs_updated
  before update on dbs_checks
  for each row execute function set_updated_at();

-- ============================================================================
-- reportable_events: SMS reporting log (10 / 20 working day duties)
-- ============================================================================
create table reportable_events (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid references workers(id) on delete cascade,
  organisation_id uuid not null references organisation(id) on delete cascade,
  event_type      text not null,   -- e.g. 'salary_change', 'absence_10_day', 'early_leaving'
  description     text,
  event_date      date not null,
  deadline        date not null,   -- event_date + 10 or 20 working days
  status          report_status not null default 'due',
  reported_on     date,
  sms_reference   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_events_status on reportable_events(status);
create index idx_events_deadline on reportable_events(deadline);

create trigger trg_events_updated
  before update on reportable_events
  for each row execute function set_updated_at();

-- ============================================================================
-- crs_snapshots: DL Compliance Readiness Score history (6 domains + overall)
-- ============================================================================
create table crs_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  organisation_id    uuid not null references organisation(id) on delete cascade,
  captured_at        timestamptz not null default now(),
  overall_score      integer not null,          -- 0-100
  overall_rating     rag_rating not null,
  right_to_work      integer,                    -- per-domain scores 0-100
  record_keeping     integer,
  reporting          integer,
  monitoring         integer,
  governance         integer,
  recruitment        integer,
  detail             jsonb,                       -- breakdown of what drove the score
  created_at         timestamptz not null default now()
);

create index idx_crs_org_time on crs_snapshots(organisation_id, captured_at desc);

-- ============================================================================
-- audit_log: append-only trail. No update/delete permitted by RLS.
-- ============================================================================
create table audit_log (
  id              bigint generated always as identity primary key,
  actor_id        uuid references app_users(id) on delete set null,
  actor_email     text,
  action          text not null,     -- 'insert' | 'update' | 'delete' | custom
  entity          text not null,     -- table name or logical entity
  entity_id       text,
  summary         text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index idx_audit_entity on audit_log(entity, entity_id);
create index idx_audit_time on audit_log(created_at desc);
