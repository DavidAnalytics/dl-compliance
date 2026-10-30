-- Migration 0016: compute the DL Compliance Readiness Score from live data

create or replace function compute_crs()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid; n int;
  d_rtw int; d_rec int; d_rep int; d_mon int; d_gov int; d_rec2 int;
  overall int; v_rating rag_rating;
begin
  select id into v_org from organisation limit 1;
  select count(*) into n from workers where sponsorship_type='sponsored' and employment_status<>'left';

  if n = 0 then
    d_rtw := 100; d_mon := 100; d_rec2 := 100;
  else
    -- Right to work: a non-failed check on file, excuse not lapsed, visa in date
    select round(100.0 * count(*) filter (where ok) / n) into d_rtw from (
      select w.id,
        ( exists (select 1 from right_to_work_checks c where c.worker_id=w.id and c.outcome<>'fail')
          and (w.visa_expiry is null or w.visa_expiry >= current_date)
          and not exists (
            select 1 from (select distinct on (worker_id) * from right_to_work_checks order by worker_id, checked_on desc) lc
            where lc.worker_id=w.id and coalesce(lc.excuse_expiry, lc.follow_up_due) is not null
              and coalesce(lc.excuse_expiry, lc.follow_up_due) < current_date)
        ) as ok
      from workers w where w.sponsorship_type='sponsored' and w.employment_status<>'left'
    ) s;

    -- Monitoring: visa in date and no unresolved reportable absence
    select round(100.0 * count(*) filter (where ok) / n) into d_mon from (
      select w.id,
        ( (w.visa_expiry is null or w.visa_expiry >= current_date)
          and not exists (select 1 from absences a where a.worker_id=w.id and a.reportable) )
        as ok
      from workers w where w.sponsorship_type='sponsored' and w.employment_status<>'left'
    ) s3;

    -- Recruitment & suitability: salary at/above going rate, DBS where required
    select round(100.0 * count(*) filter (where ok) / n) into d_rec2 from (
      select w.id,
        ( ( coalesce((select going_rate_annual from soc_going_rates g where g.soc_code=w.soc_code), 0) = 0
            or w.annual_salary >= (select going_rate_annual from soc_going_rates g where g.soc_code=w.soc_code) )
          and (not w.requires_dbs or exists (select 1 from dbs_checks d where d.worker_id=w.id)) )
        as ok
      from workers w where w.sponsorship_type='sponsored' and w.employment_status<>'left'
    ) s4;
  end if;

  -- Record keeping: average of present/required across workers that have a checklist
  select round(coalesce(avg(pct), 0)) into d_rec from (
    select case when count(*) filter (where required) = 0 then 0
           else 100.0 * count(*) filter (where required and status='present') / count(*) filter (where required) end as pct
    from required_documents group by worker_id
  ) s2;
  d_rec := coalesce(d_rec, 0);

  -- Reporting: full marks unless there are overdue reports
  select greatest(0, 100 - 25 * count(*)) into d_rep from reportable_events where status='due' and deadline < current_date;

  -- Governance: the three core SMS roles present
  select round(100.0 * (
      (case when exists (select 1 from key_personnel where sms_role='authorising_officer') then 1 else 0 end)
    + (case when exists (select 1 from key_personnel where sms_role='key_contact') then 1 else 0 end)
    + (case when exists (select 1 from key_personnel where sms_role='level_1_user') then 1 else 0 end)
  ) / 3.0) into d_gov;

  overall := round(d_rtw*0.25 + d_rec*0.20 + d_rep*0.20 + d_mon*0.15 + d_gov*0.10 + d_rec2*0.10);
  v_rating := (case when overall >= 85 then 'green' when overall >= 60 then 'amber' else 'red' end)::rag_rating;

  insert into crs_snapshots (organisation_id, overall_score, overall_rating, right_to_work, record_keeping, reporting, monitoring, governance, recruitment, detail)
  values (v_org, overall, v_rating, d_rtw, d_rec, d_rep, d_mon, d_gov, d_rec2, jsonb_build_object('workers', n, 'computed_at', now()));
end;
$$;

revoke execute on function compute_crs() from public, anon, authenticated;

-- nightly, just before the alerts run, and once now
select cron.schedule('compute-crs', '45 5 * * *', $$select compute_crs();$$);
select compute_crs();
