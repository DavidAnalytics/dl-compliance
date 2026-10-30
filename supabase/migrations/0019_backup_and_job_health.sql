-- Migration 0019: nightly backup recipient setting + scheduled-job health check.

-- Recipient for the nightly backup email.
alter table settings add column if not exists backup_emails text[] default array['david@dlbusinesssystems.com']::text[];
update settings set backup_emails = array['backups@dlbusinesssystems.com']::text[] where backup_emails is null
   or backup_emails = array['david@dlbusinesssystems.com']::text[];

-- Health of the scheduled jobs, read from pg_cron's run history.
-- "healthy" is true when a job has never run yet (benefit of the doubt) or its
-- most recent run succeeded within the last 26 hours; false on a failure or a
-- success that has gone stale (the job stopped firing).
create or replace function job_health()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'job', j.jobname,
    'schedule', j.schedule,
    'last_status', d.status,
    'last_run', d.end_time,
    'healthy', (d.status is null) or (d.status = 'succeeded' and d.end_time > now() - interval '26 hours')
  ) order by j.jobname), '[]'::jsonb)
  from cron.job j
  left join lateral (
    select status, end_time from cron.job_run_details r
    where r.jobid = j.jobid order by r.start_time desc limit 1
  ) d on true;
$$;

revoke execute on function job_health() from public, anon, authenticated;
grant execute on function job_health() to service_role;

-- The nightly backup itself runs in the `nightly-backup` edge function
-- (source under supabase/functions/nightly-backup/), invoked by a pg_cron job.
-- See MIGRATIONS-NOTES.md for the schedule command.
