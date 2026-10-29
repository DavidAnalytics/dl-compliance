-- ============================================================================
-- Migration 0006: security hardening from Supabase advisor findings
-- ============================================================================
-- Already applied to the live project. Kept here so the repository matches
-- the database.
-- ============================================================================

-- Pin search_path on the timestamp helper
alter function set_updated_at() set search_path = public;

-- audit_capture is a trigger-only function; it should never be callable over
-- the REST API. Triggers still fire regardless of these grants.
revoke execute on function audit_capture() from public, anon, authenticated;
