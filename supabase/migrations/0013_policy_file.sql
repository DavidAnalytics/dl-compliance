-- Migration 0013: allow a PDF to be attached to each policy
alter table policies add column if not exists file_path text;
