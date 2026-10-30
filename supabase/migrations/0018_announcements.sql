-- Migration 0018: News, events and perks the admin posts for the team.
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation(id),
  type text not null default 'news' check (type in ('news','event','perk')),
  title text not null,
  body text,
  event_date date,
  is_published boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_published_idx on announcements (is_published, created_at desc);

alter table announcements enable row level security;

create policy announcements_select on announcements for select
  using ((is_published and is_active_user())
         or current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

create policy announcements_write on announcements for all
  using (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]))
  with check (current_user_has_role(array['admin','authorising_officer','hr']::app_role[]));

grant select, insert, update, delete on announcements to authenticated;
grant select, insert, update, delete on announcements to service_role;
