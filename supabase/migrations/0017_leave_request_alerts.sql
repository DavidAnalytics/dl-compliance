-- Migration 0017: pending leave requests surface as alerts on the staff bell.
--
-- PREREQUISITE (run once, on its own, before this migration — see
-- MIGRATIONS-NOTES.md): the 'leave_request' value must exist on the alert_type
-- enum. ADD VALUE cannot run in the same transaction that uses the value:
--   alter type alert_type add value if not exists 'leave_request';

create or replace function sync_leave_alerts()
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select id into v_org from organisation limit 1;
  delete from alerts where status = 'open' and alert_type = 'leave_request';
  insert into alerts (organisation_id, worker_id, alert_type, severity, status, title, detail, due_date, days_out)
  select v_org, lr.worker_id, 'leave_request', 'info'::alert_severity, 'open',
    'Leave request pending approval',
    w.first_name || ' ' || w.last_name || ' requested '
      || coalesce(lr.working_days::text || ' day(s) ', '')
      || 'from ' || to_char(lr.start_date, 'DD Mon YYYY') || ' to ' || to_char(lr.end_date, 'DD Mon YYYY'),
    lr.start_date, (lr.start_date - current_date)
  from leave_requests lr join workers w on w.id = lr.worker_id
  where lr.status = 'pending';
end; $$;

revoke execute on function sync_leave_alerts() from public, anon, authenticated;

create or replace function trg_leave_alerts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform sync_leave_alerts();
  return null;
end; $$;

revoke execute on function trg_leave_alerts() from public, anon, authenticated;

drop trigger if exists leave_requests_alert_sync on leave_requests;
create trigger leave_requests_alert_sync
after insert or delete or update of status on leave_requests
for each statement execute function trg_leave_alerts();

-- keep the nightly rebuild in sync
create or replace function generate_alerts()
returns void language plpgsql security definer set search_path = public as $function$
declare v_org uuid;
begin
  select id into v_org from organisation limit 1;
  delete from alerts where status = 'open';

  insert into alerts (organisation_id, worker_id, alert_type, severity, status, title, detail, due_date, days_out)
  select v_org, w.id, 'visa_expiry',
    (case when (w.visa_expiry - current_date) <= 7 then 'red' else 'amber' end)::alert_severity,
    'open', 'Visa expiry',
    w.first_name || ' ' || w.last_name || ' — visa expires ' || to_char(w.visa_expiry, 'DD Mon YYYY'),
    w.visa_expiry, (w.visa_expiry - current_date)
  from workers w
  where w.sponsorship_type = 'sponsored' and w.employment_status <> 'left'
    and w.visa_expiry is not null and (w.visa_expiry - current_date) <= 90;

  insert into alerts (organisation_id, worker_id, alert_type, severity, status, title, detail, due_date, days_out)
  select v_org, c.worker_id, 'rtw_follow_up',
    (case when (coalesce(c.excuse_expiry, c.follow_up_due) - current_date) <= 7 then 'red' else 'amber' end)::alert_severity,
    'open', 'Right to work follow-up',
    'Follow-up check due ' || to_char(coalesce(c.excuse_expiry, c.follow_up_due), 'DD Mon YYYY'),
    coalesce(c.excuse_expiry, c.follow_up_due), (coalesce(c.excuse_expiry, c.follow_up_due) - current_date)
  from (select distinct on (worker_id) * from right_to_work_checks order by worker_id, checked_on desc) c
  where coalesce(c.excuse_expiry, c.follow_up_due) is not null
    and (coalesce(c.excuse_expiry, c.follow_up_due) - current_date) <= 90;

  insert into alerts (organisation_id, worker_id, alert_type, severity, status, title, detail, due_date, days_out)
  select v_org, d.worker_id, 'dbs_renewal',
    (case when (d.renewal_due - current_date) <= 7 then 'red' else 'amber' end)::alert_severity,
    'open', 'DBS renewal', 'DBS renewal due ' || to_char(d.renewal_due, 'DD Mon YYYY'),
    d.renewal_due, (d.renewal_due - current_date)
  from dbs_checks d
  where d.renewal_due is not null and (d.renewal_due - current_date) <= 90;

  insert into alerts (organisation_id, worker_id, alert_type, severity, status, title, detail, due_date, days_out)
  select v_org, dc.worker_id, 'document_expiry',
    (case when (dc.retention_until - current_date) <= 7 then 'red' else 'amber' end)::alert_severity,
    'open', 'Document expiry', dc.title || ' expires ' || to_char(dc.retention_until, 'DD Mon YYYY'),
    dc.retention_until, (dc.retention_until - current_date)
  from documents dc
  where dc.retention_until is not null and (dc.retention_until - current_date) <= 90;

  insert into alerts (organisation_id, worker_id, alert_type, severity, status, title, detail, due_date, days_out)
  select v_org, re.worker_id, 'reporting_deadline',
    (case when (re.deadline - current_date) <= 7 then 'red' else 'amber' end)::alert_severity,
    'open', 'Reporting deadline',
    replace(re.event_type, '_', ' ') || ' — report by ' || to_char(re.deadline, 'DD Mon YYYY'),
    re.deadline, (re.deadline - current_date)
  from reportable_events re
  where re.status = 'due';

  insert into alerts (organisation_id, worker_id, alert_type, severity, status, title, detail, due_date, days_out)
  select v_org, rr.worker_id, 'role_review_due',
    (case when (rr.next_review_due - current_date) <= 7 then 'red' else 'amber' end)::alert_severity,
    'open', 'Role eligibility review', 'Role review due ' || to_char(rr.next_review_due, 'DD Mon YYYY'),
    rr.next_review_due, (rr.next_review_due - current_date)
  from role_eligibility_reviews rr
  where rr.next_review_due is not null and (rr.next_review_due - current_date) <= 90;

  perform sync_leave_alerts();
end;
$function$;

select sync_leave_alerts();
