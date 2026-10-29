-- ============================================================================
-- Migration 0002: Row Level Security
-- ============================================================================
-- Principle: deny by default. Every table has RLS enabled. Staff roles
-- (admin, authorising_officer, hr) can read all records; write access is
-- scoped by role. Workers see only their own record. The audit_log is
-- append-only: insert allowed, update and delete denied to everyone.
-- ============================================================================

-- Enable RLS on all tables
alter table organisation          enable row level security;
alter table app_users             enable row level security;
alter table key_personnel         enable row level security;
alter table workers               enable row level security;
alter table right_to_work_checks  enable row level security;
alter table absences              enable row level security;
alter table policies              enable row level security;
alter table documents             enable row level security;
alter table acknowledgements      enable row level security;
alter table dbs_checks            enable row level security;
alter table reportable_events     enable row level security;
alter table crs_snapshots         enable row level security;
alter table audit_log             enable row level security;

-- Convenience role groups
-- staff  = admin, authorising_officer, hr   (full operational access)
-- manage = admin, authorising_officer       (configuration / governance)

-- ---------------------------------------------------------------------------
-- organisation
-- ---------------------------------------------------------------------------
create policy org_select on organisation
  for select using (is_active_user());

create policy org_update on organisation
  for update using (current_user_has_role(array['admin','authorising_officer']::app_role[]));

create policy org_insert on organisation
  for insert with check (current_user_has_role(array['admin']::app_role[]));

-- ---------------------------------------------------------------------------
-- app_users: a user can always read their own row; admins read/write all
-- ---------------------------------------------------------------------------
create policy users_select_self on app_users
  for select using (id = auth.uid() or current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

create policy users_admin_write on app_users
  for all using (current_user_has_role(array['admin']::app_role[]))
  with check (current_user_has_role(array['admin']::app_role[]));

-- ---------------------------------------------------------------------------
-- key_personnel: staff read; manage write
-- ---------------------------------------------------------------------------
create policy kp_select on key_personnel
  for select using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

create policy kp_write on key_personnel
  for all using (current_user_has_role(array['admin','authorising_officer']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer']::app_role[]));

-- ---------------------------------------------------------------------------
-- workers: staff read all; a worker reads only their own linked record;
-- staff write
-- ---------------------------------------------------------------------------
create policy workers_select on workers
  for select using (
    current_user_has_role(array['admin','authorising_officer','hr']::app_role[])
    or app_user_id = auth.uid()
  );

create policy workers_write on workers
  for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

-- ---------------------------------------------------------------------------
-- Helper: does the current user own (via linked worker) this worker_id?
-- ---------------------------------------------------------------------------
create or replace function owns_worker(w_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workers where id = w_id and app_user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- right_to_work_checks, absences, dbs_checks, documents:
-- staff full access; worker read-only on their own
-- ---------------------------------------------------------------------------
create policy rtw_select on right_to_work_checks
  for select using (
    current_user_has_role(array['admin','authorising_officer','hr']::app_role[])
    or owns_worker(worker_id)
  );
create policy rtw_write on right_to_work_checks
  for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

create policy absences_select on absences
  for select using (
    current_user_has_role(array['admin','authorising_officer','hr']::app_role[])
    or owns_worker(worker_id)
  );
create policy absences_write on absences
  for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

create policy dbs_select on dbs_checks
  for select using (
    current_user_has_role(array['admin','authorising_officer','hr']::app_role[])
    or owns_worker(worker_id)
  );
create policy dbs_write on dbs_checks
  for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

create policy documents_select on documents
  for select using (
    current_user_has_role(array['admin','authorising_officer','hr']::app_role[])
    or owns_worker(worker_id)
  );
create policy documents_write on documents
  for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

-- ---------------------------------------------------------------------------
-- policies: all active users read published policies; staff read all; manage write
-- ---------------------------------------------------------------------------
create policy policies_select on policies
  for select using (
    (is_published and is_active_user())
    or current_user_has_role(array['admin','authorising_officer','hr']::app_role[])
  );
create policy policies_write on policies
  for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

-- ---------------------------------------------------------------------------
-- acknowledgements: staff read all; worker reads/creates own
-- ---------------------------------------------------------------------------
create policy ack_select on acknowledgements
  for select using (
    current_user_has_role(array['admin','authorising_officer','hr']::app_role[])
    or owns_worker(worker_id)
  );
create policy ack_insert on acknowledgements
  for insert with check (
    current_user_has_role(array['admin','authorising_officer','hr']::app_role[])
    or owns_worker(worker_id)
  );

-- ---------------------------------------------------------------------------
-- reportable_events: staff read; manage + hr write
-- ---------------------------------------------------------------------------
create policy events_select on reportable_events
  for select using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));
create policy events_write on reportable_events
  for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

-- ---------------------------------------------------------------------------
-- crs_snapshots: staff read; inserted by the scheduled job (service role
-- bypasses RLS) or by manage
-- ---------------------------------------------------------------------------
create policy crs_select on crs_snapshots
  for select using (current_user_has_role(array['admin','authorising_officer','hr','viewer']::app_role[]));
create policy crs_insert on crs_snapshots
  for insert with check (current_user_has_role(array['admin','authorising_officer']::app_role[]));

-- ---------------------------------------------------------------------------
-- audit_log: APPEND-ONLY. Any active user may insert; staff may read;
-- nobody may update or delete (no such policies exist, so both are denied).
-- ---------------------------------------------------------------------------
create policy audit_insert on audit_log
  for insert with check (is_active_user());
create policy audit_select on audit_log
  for select using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));
-- No update or delete policy is defined by design, so RLS denies both to all
-- client roles. Only the service role (used by trusted server jobs) can bypass.
