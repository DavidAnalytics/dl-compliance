-- ============================================================================
-- Migration 0008: leave management
-- Already applied to the live project. Kept here so the repo matches the DB.
-- Bank holidays are England & Wales, 2026 and 2027.
-- ============================================================================

create type leave_status as enum ('pending','approved','rejected','cancelled');

create table leave_types (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id) on delete cascade,
  name text not null,
  paid boolean not null default true,
  colour text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table leave_entitlements (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  year int not null,
  entitlement_days numeric(5,1) not null default 28,
  carried_over_days numeric(5,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (worker_id, year)
);
create trigger trg_entitle_updated before update on leave_entitlements for each row execute function set_updated_at();

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  leave_type_id uuid references leave_types(id) on delete set null,
  start_date date not null,
  end_date date not null,
  working_days numeric(5,1),
  status leave_status not null default 'pending',
  reason text,
  decided_by uuid references app_users(id) on delete set null,
  decided_at timestamptz,
  decision_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_leave_dates check (end_date >= start_date)
);
create index idx_leave_req_worker on leave_requests(worker_id);
create index idx_leave_req_status on leave_requests(status);
create trigger trg_leavereq_updated before update on leave_requests for each row execute function set_updated_at();

create table return_to_work (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  absence_id uuid references absences(id) on delete set null,
  conducted_on date not null default current_date,
  conducted_by text,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_rtw_worker2 on return_to_work(worker_id);

alter table absences add column if not exists leave_request_id uuid references leave_requests(id) on delete set null;

alter table leave_types enable row level security;
alter table leave_entitlements enable row level security;
alter table leave_requests enable row level security;
alter table return_to_work enable row level security;

create policy lt_select on leave_types for select using (is_active_user());
create policy lt_write on leave_types for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[])) with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));
create policy le_select on leave_entitlements for select using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]) or owns_worker(worker_id));
create policy le_write on leave_entitlements for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[])) with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));
create policy lr_select on leave_requests for select using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]) or owns_worker(worker_id));
create policy lr_write on leave_requests for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]) or owns_worker(worker_id)) with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]) or owns_worker(worker_id));
create policy rtw2_select on return_to_work for select using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]) or owns_worker(worker_id));
create policy rtw2_write on return_to_work for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[])) with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

do $$
declare t text; tables text[] := array['leave_types','leave_entitlements','leave_requests','return_to_work'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function audit_capture();', t);
  end loop;
end $$;

insert into leave_types (organisation_id, name, paid, colour) values
  ('00000000-0000-0000-0000-0000000000d1','Annual leave', true, '#635BE5'),
  ('00000000-0000-0000-0000-0000000000d1','Sick leave', true, '#E08A0B'),
  ('00000000-0000-0000-0000-0000000000d1','Unpaid leave', false, '#9A9CB3'),
  ('00000000-0000-0000-0000-0000000000d1','Parental leave', true, '#2BB8A3'),
  ('00000000-0000-0000-0000-0000000000d1','Compassionate leave', true, '#EC6A99')
on conflict do nothing;

insert into bank_holidays (holiday_date, title) values
  ('2026-01-01','New Year''s Day'),('2026-04-03','Good Friday'),('2026-04-06','Easter Monday'),
  ('2026-05-04','Early May bank holiday'),('2026-05-25','Spring bank holiday'),('2026-08-31','Summer bank holiday'),
  ('2026-12-25','Christmas Day'),('2026-12-28','Boxing Day (substitute day)'),
  ('2027-01-01','New Year''s Day'),('2027-03-26','Good Friday'),('2027-03-29','Easter Monday'),
  ('2027-05-03','Early May bank holiday'),('2027-05-31','Spring bank holiday'),('2027-08-30','Summer bank holiday'),
  ('2027-12-27','Christmas Day (substitute day)'),('2027-12-28','Boxing Day (substitute day)')
on conflict (holiday_date) do nothing;

insert into leave_entitlements (worker_id, year, entitlement_days)
values ('00000000-0000-0000-0000-00000000a001', 2026, 28)
on conflict (worker_id, year) do nothing;

grant select, insert, update, delete on all tables in schema public to authenticated;
