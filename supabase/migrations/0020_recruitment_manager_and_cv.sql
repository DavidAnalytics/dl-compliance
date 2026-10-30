-- Migration 0020: recruitment fixes from testing.
-- Hiring manager is a staff user (e.g. Jonathan), not necessarily an employee
-- record, so point it at app_users instead of workers. And add a CV file path
-- so applicant CVs can be uploaded rather than linked.

alter table vacancies drop constraint if exists vacancies_hiring_manager_id_fkey;
update vacancies set hiring_manager_id = null;
alter table vacancies add constraint vacancies_hiring_manager_id_fkey
  foreign key (hiring_manager_id) references app_users(id) on delete set null;

-- Store an uploaded CV file path (in the private 'documents' storage bucket).
alter table candidates add column if not exists cv_path text;
