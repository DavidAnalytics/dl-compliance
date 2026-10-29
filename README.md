# DL Compliance

People and sponsor compliance platform for **DL Business Systems Ltd** (company number 17211065).

A single system of record that holds HR data and layers the UKVI sponsor duties engine on top: the Engaged Workers Register, Right to Work and eVisa checks, absence monitoring, document management, the policy library, an append-only audit trail, and the **DL Compliance Readiness Score (DL-CRS)** across six domains.

This repository is **Phase 0 plus the Phase 1 shell**: the foundation (stack, schema, access rules, auth, deploy pipeline) with a working dashboard and policy library. The remaining module screens are built out in Phases 1 and 2.

## Stack

- **Front end:** React, Vite, TypeScript, Tailwind
- **Data and auth:** Supabase (Postgres, Auth, Storage, Row Level Security), London region
- **Hosting:** Netlify
- **Later phases:** Netlify functions, Resend (email), Anthropic API (SMS Copilot), pg_cron (nightly DL-CRS)

## Project layout

```
dl-compliance/
  src/
    components/     Layout, ProtectedRoute
    contexts/       AuthContext
    lib/            supabase client, crs scoring model
    pages/          Login, Dashboard, Policies, module placeholders
    types/          database types
  supabase/
    migrations/     0001_init.sql, 0002_rls.sql, 0003_seed.sql
  netlify/
    functions/      (Phase 2 serverless jobs)
  netlify.toml      build + security headers
```

## Setup

See **SETUP.md** for the full step-by-step. In short:

1. Create a Supabase project in the **London (London, eu-west-2)** region.
2. Run the three migration files in order in the Supabase SQL editor.
3. Create a private Storage bucket named `documents`.
4. Create your first admin user and link it in `app_users`.
5. Deploy this repo to Netlify and set the two `VITE_` environment variables.

## Local development

```bash
cp .env.example .env.local      # fill in your Supabase URL and anon key
npm install
npm run dev                     # http://localhost:5173
```

## Notes

Internal record-keeping system. Not a substitute for legal advice. UKVI reporting
thresholds and reportable events are designed to be editable in settings as the
rules change.
