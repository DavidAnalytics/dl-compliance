-- Migration 0021: close a vacancy automatically once its hired candidates
-- reach its openings, and reopen it if that count later drops below.
create or replace function sync_vacancy_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id uuid; hired int; opg int;
begin
  v_id := coalesce(NEW.vacancy_id, OLD.vacancy_id);
  if v_id is null then return null; end if;
  select count(*) into hired from candidates where vacancy_id = v_id and stage = 'hired';
  select coalesce(openings, 1) into opg from vacancies where id = v_id;
  update vacancies set status = case when hired >= opg then 'closed' else 'open' end
   where id = v_id and status <> case when hired >= opg then 'closed' else 'open' end;
  return null;
end; $$;

revoke execute on function sync_vacancy_status() from public, anon, authenticated;

drop trigger if exists candidates_close_vacancy on candidates;
create trigger candidates_close_vacancy
after insert or delete or update of stage on candidates
for each row execute function sync_vacancy_status();
