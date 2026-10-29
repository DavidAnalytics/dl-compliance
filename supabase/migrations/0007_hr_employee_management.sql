-- ============================================================================
-- Migration 0007: HR employee management additions
-- Already applied to the live project. Kept here so the repo matches the DB.
-- ============================================================================

create table departments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table workers
  add column if not exists employee_number text,
  add column if not exists department_id uuid references departments(id) on delete set null,
  add column if not exists manager_id uuid references workers(id) on delete set null,
  add column if not exists contract_type text;

create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  name text not null,
  relationship text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);
create index idx_emergency_worker on emergency_contacts(worker_id);

create table employee_events (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  event_type text not null,
  effective_date date not null default current_date,
  detail text,
  created_by text,
  created_at timestamptz not null default now()
);
create index idx_empevents_worker on employee_events(worker_id);

alter table departments enable row level security;
alter table emergency_contacts enable row level security;
alter table employee_events enable row level security;

create policy dept_select on departments for select using (is_active_user());
create policy dept_write on departments for all using (
  current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

create policy ec_select on emergency_contacts for select using (
  current_user_has_role(array['admin','authorising_officer','hr']::app_role[]) or owns_worker(worker_id));
create policy ec_write on emergency_contacts for all using (
  current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

create policy ee_select on employee_events for select using (
  current_user_has_role(array['admin','authorising_officer','hr']::app_role[]) or owns_worker(worker_id));
create policy ee_write on employee_events for all using (
  current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

do $$
declare
  t text;
  tables text[] := array['departments','emergency_contacts','employee_events'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function audit_capture();', t);
  end loop;
end $$;

insert into departments (organisation_id, name) values
  ('00000000-0000-0000-0000-0000000000d1', 'Consulting'),
  ('00000000-0000-0000-0000-0000000000d1', 'Operations')
on conflict do nothing;

grant select, insert, update, delete on all tables in schema public to authenticated;
