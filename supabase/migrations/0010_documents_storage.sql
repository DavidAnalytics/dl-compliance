-- ============================================================================
-- Migration 0010: private Storage bucket for documents + access policies
-- Already applied to the live project. Kept here so the repo matches the DB.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_read" on storage.objects;
drop policy if exists "documents_insert" on storage.objects;
drop policy if exists "documents_update" on storage.objects;
drop policy if exists "documents_delete" on storage.objects;

create policy "documents_read" on storage.objects for select to authenticated using (bucket_id = 'documents');
create policy "documents_insert" on storage.objects for insert to authenticated with check (bucket_id = 'documents');
create policy "documents_update" on storage.objects for update to authenticated using (bucket_id = 'documents');
create policy "documents_delete" on storage.objects for delete to authenticated using (bucket_id = 'documents');
