-- ============================================================================
-- Migration 0009: recruitment and onboarding
-- Already applied to the live project. Kept here so the repo matches the DB.
-- ============================================================================

create table vacancies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id) on delete cascade,
  title text not null,
  department_id uuid references departments(id) on delete set null,
  hiring_manager_id uuid references workers(id) on delete set null,
  description text,
  openings int not null default 1,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_vacancy_updated before update on vacancies for each row execute function set_updated_at();

create table candidates (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references vacancies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  stage text not null default 'applied',
  cv_url text,
  notes text,
  feedback text,
  offer_salary numeric(12,2),
  offer_start_date date,
  offer_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_candidates_vacancy on candidates(vacancy_id);
create trigger trg_candidate_updated before update on candidates for each row execute function set_updated_at();

create table onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  title text not null,
  category text,
  status text not null default 'pending',
  due_date date,
  assignee text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_onboarding_worker on onboarding_tasks(worker_id);
create trigger trg_onboard_updated before update on onboarding_tasks for each row execute function set_updated_at();

alter table vacancies enable row level security;
alter table candidates enable row level security;
alter table onboarding_tasks enable row level security;

create policy vac_all on vacancies for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[])) with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));
create policy cand_all on candidates for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[])) with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));
create policy onb_select on onboarding_tasks for select using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]) or owns_worker(worker_id));
create policy onb_write on onboarding_tasks for all using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[])) with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

do $$
declare t text; tables text[] := array['vacancies','candidates','onboarding_tasks'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function audit_capture();', t);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema public to authenticated;
