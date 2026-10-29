# Phase 1 update, part 1

This update adds the data foundation for the full Phase 1 design, plus the first working screens: the redesigned interface, the Engaged Workers register, and the worker profile.

## What changed

- A new look: the ink command rail with a Compliance / HR workspace switch, brass accents, IBM Plex type, and refined RAG status throughout.
- **Workers register:** search, live compliance status per worker, add and edit.
- **Worker profile:** status header, a six-check compliance strip, and tabs for Right to Work, Absence, Documents and Audit.
- **New database tables:** contact history, required-documents checklist, alerts, SOC going rates, bank holidays, attendance, pay periods, role-eligibility reviews, and settings.
- **Automatic audit:** every change to a core table is now written to the audit log by the database itself.

## Deploy this update, two parts

### Part A. Run the two new database migrations

In Supabase, open **SQL Editor** and run these in order, same as before:

1. `supabase/migrations/0004_phase1_schema.sql`
2. `supabase/migrations/0005_audit_triggers.sql`

Migration 0004 also re-runs the grants, so the new tables are reachable by the app without any manual step. You do not need to touch the Data API settings again.

### Part B. Push the updated code

Replace your project files with this update, keeping your existing Git link, then push. From your `dl-compliance` folder:

1. Copy the contents of this update over your existing folder, replacing when asked. Keep the hidden `.git` folder you already have.
2. In the terminal, in that folder:

```
git add .
git commit -m "Phase 1 part 1: data model, audit, workers register and profile"
git push
```

Netlify rebuilds automatically when you push. Give it a minute or two, then reload the site.

## What you can do after deploying

- Open **Workers** and add the real sponsored worker, or edit the sample one.
- Open a worker to see the profile, the compliance strip, and the tabs.
- The register and profile status update live from the data you enter.

## Still to come in Phase 1

Right to Work capture, Employment & CoS with going-rate checks, absence entry with the 10 working day trigger, document upload and the checklist, the alerts engine and the dashboard rebuild, then the HR workspace and the audit pack.
