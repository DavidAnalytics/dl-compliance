-- ============================================================================
-- Migration 0015: RBAC support and policy acknowledgement versioning
-- Already applied to the live project. Kept here so the repo matches the DB.
-- ============================================================================

-- track which policy version an acknowledgement was against
alter table acknowledgements add column if not exists policy_version text;

-- Roles are set per user in app_users.role:
--   admin / authorising_officer / hr  -> full access (staff)
--   worker                            -> employee self-service only
-- Workers are linked to their employee record via workers.app_user_id = auth user id.
-- The front end enforces the navigation; row-level security enforces the data boundary.
