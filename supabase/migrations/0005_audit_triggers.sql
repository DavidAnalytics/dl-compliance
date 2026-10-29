-- ============================================================================
-- Migration 0005: automatic audit capture
-- ============================================================================
-- A generic trigger writes to audit_log on every insert, update and delete of
-- the compliance-relevant tables. The actor is taken from the auth context, so
-- the trail records who did what without the app having to remember to log it.
-- audit_log remains append-only (no update/delete policy exists for it).
-- ============================================================================

create or replace function audit_capture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := auth.uid();
  v_email   text;
  v_entity_id text;
  v_summary text;
begin
  -- Resolve actor email where we can
  select email into v_email from app_users where id = v_actor;

  if (tg_op = 'DELETE') then
    v_entity_id := old.id::text;
    v_summary := 'Deleted ' || tg_table_name;
    insert into audit_log (actor_id, actor_email, action, entity, entity_id, summary, metadata)
    values (v_actor, v_email, 'delete', tg_table_name, v_entity_id, v_summary, to_jsonb(old));
    return old;
  elsif (tg_op = 'UPDATE') then
    v_entity_id := new.id::text;
    v_summary := 'Updated ' || tg_table_name;
    insert into audit_log (actor_id, actor_email, action, entity, entity_id, summary, metadata)
    values (v_actor, v_email, 'update', tg_table_name, v_entity_id, v_summary,
            jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
    return new;
  else -- INSERT
    v_entity_id := new.id::text;
    v_summary := 'Created ' || tg_table_name;
    insert into audit_log (actor_id, actor_email, action, entity, entity_id, summary, metadata)
    values (v_actor, v_email, 'insert', tg_table_name, v_entity_id, v_summary, to_jsonb(new));
    return new;
  end if;
end;
$$;

-- Attach the trigger to each table worth auditing.
-- (audit_log itself is deliberately excluded to avoid recursion.)
do $$
declare
  t text;
  tables text[] := array[
    'workers', 'right_to_work_checks', 'absences', 'attendance',
    'documents', 'required_documents', 'acknowledgements', 'dbs_checks',
    'reportable_events', 'policies', 'key_personnel', 'contact_history',
    'pay_periods', 'role_eligibility_reviews', 'organisation', 'settings',
    'soc_going_rates', 'alerts'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%1$s on %1$s;', t);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on %1$s
       for each row execute function audit_capture();', t);
  end loop;
end $$;
