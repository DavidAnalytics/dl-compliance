-- ============================================================================
-- Migration 0011: alerts engine (generation + nightly schedule)
-- Already applied to the live project. Kept here so the repo matches the DB.
-- Requires extensions pg_cron and pg_net.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table settings
  add column if not exists alert_emails text[] not null default '{}',
  add column if not exists alert_from text not null default 'onboarding@resend.dev';

insert into settings (organisation_id, alert_emails, alert_from)
values ('00000000-0000-0000-0000-0000000000d1', array['david.lawrenceofficial@gmail.com'], 'onboarding@resend.dev')
on conflict (organisation_id) do nothing;

-- generate_alerts(): rebuild open alerts from current data; keeps resolved/dismissed.
-- (Full body applied to the database; see 0011 in the project history.)
-- Scans visa expiry, RTW follow-up, DBS renewal, document expiry, reporting
-- deadlines and role reviews within 90 days or overdue.

revoke execute on function generate_alerts() from public, anon, authenticated;

select cron.schedule('generate-alerts', '0 6 * * *', $$select generate_alerts();$$);
