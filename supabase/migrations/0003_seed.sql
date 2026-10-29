-- ============================================================================
-- Migration 0003: seed data for DL Business Systems Ltd
-- ============================================================================
-- Safe to run once on a fresh database. Uses fixed UUIDs so later migrations
-- and the app can reference the organisation reliably. Replace placeholder
-- values (licence number, personnel, the sample worker) with real data in-app.
-- ============================================================================

-- Organisation (fixed id for easy reference)
insert into organisation (id, legal_name, company_number, sponsor_licence_no,
                          licence_rating, licence_route, default_soc_code, registered_address)
values (
  '00000000-0000-0000-0000-0000000000d1',
  'DL Business Systems Ltd',
  '17211065',
  'PLACEHOLDER-LICENCE-NO',
  'A',
  'Skilled Worker',
  null,
  'PLACEHOLDER - registered office address'
)
on conflict (id) do nothing;

-- Key personnel placeholders (edit in-app with real names)
insert into key_personnel (organisation_id, full_name, sms_role, email, appointed_on)
values
  ('00000000-0000-0000-0000-0000000000d1', 'David Lawrence', 'authorising_officer', null, current_date),
  ('00000000-0000-0000-0000-0000000000d1', 'David Lawrence', 'key_contact',        null, current_date),
  ('00000000-0000-0000-0000-0000000000d1', 'David Lawrence', 'level_1_user',        null, current_date)
on conflict do nothing;

-- The twelve standard policies (concise placeholders; full text added at the
-- review pass). Published so they appear in the library immediately.
insert into policies (organisation_id, title, slug, version, effective_date, review_date, is_published, body)
values
  ('00000000-0000-0000-0000-0000000000d1', 'Sickness Absence Policy', 'sickness-absence', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Equality, Diversity and Inclusion Policy', 'edi', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Anti-Harassment and Bullying Policy', 'anti-harassment', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Disciplinary Policy and Procedure', 'disciplinary', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Grievance Policy and Procedure', 'grievance', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Health and Safety Policy', 'health-safety', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Data Protection and Privacy Policy', 'data-protection', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Code of Conduct', 'code-of-conduct', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Whistleblowing Policy', 'whistleblowing', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Flexible Working Policy', 'flexible-working', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'IT and Acceptable Use Policy', 'it-acceptable-use', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.'),
  ('00000000-0000-0000-0000-0000000000d1', 'Remote and Hybrid Working Policy', 'remote-hybrid', '1.0', date '2026-11-01', date '2027-11-01', true, 'Full policy text to be added at review pass.')
on conflict (organisation_id, slug, version) do nothing;

-- A sample sponsored worker so the register and dashboard show real rows.
-- Delete or overwrite with the real worker in-app.
insert into workers (id, organisation_id, first_name, last_name, nationality,
                     job_title, soc_code, annual_salary, start_date, work_location,
                     employment_status, sponsorship_type, cos_reference, visa_type,
                     visa_start, visa_expiry, requires_dbs)
values (
  '00000000-0000-0000-0000-00000000a001',
  '00000000-0000-0000-0000-0000000000d1',
  'Sample', 'Worker', 'Nigeria',
  'Business Analyst', '2423', 42000.00, date '2026-09-01', 'London (remote-first)',
  'active', 'sponsored', 'COS-SAMPLE-0001', 'Skilled Worker',
  date '2026-08-15', date '2029-08-15', false
)
on conflict (id) do nothing;

-- A right to work check for the sample worker
insert into right_to_work_checks (worker_id, method, share_code, checked_on, checked_by, outcome, follow_up_due)
values (
  '00000000-0000-0000-0000-00000000a001',
  'online_share_code', 'W25-SAMPLE', date '2026-08-20', 'David Lawrence',
  'pass_time_limited', date '2029-08-15'
)
on conflict do nothing;

-- An opening CRS snapshot so the dashboard trend has a starting point
insert into crs_snapshots (organisation_id, overall_score, overall_rating,
                          right_to_work, record_keeping, reporting, monitoring,
                          governance, recruitment, detail)
values (
  '00000000-0000-0000-0000-0000000000d1', 78, 'amber',
  90, 70, 80, 75, 85, 68,
  '{"note": "Opening baseline from seed data. Recalculated nightly once live."}'::jsonb
)
on conflict do nothing;
