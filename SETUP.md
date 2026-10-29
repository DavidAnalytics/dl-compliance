# DL Compliance — Setup and Deploy Guide

This takes you from an empty Supabase account to a live app on your Netlify, start to finish. No prior setup assumed. Follow the steps in order. Where a value is created, note it down for the step that uses it.

Keys and passwords live only in your own Supabase and Netlify accounts. They are never committed to the repository.

---

## Part 1. Create the Supabase project (the data layer)

1. Go to **supabase.com** and sign in or create a free account.
2. Click **New project**.
3. Set:
   - **Name:** `dl-compliance`
   - **Database password:** generate a strong one and save it in your password manager. You will rarely need it, but keep it.
   - **Region:** **London (eu-west-2)**. This keeps all data in the UK. Do not skip this, it cannot be changed later without recreating the project.
4. Click **Create new project** and wait a minute or two for it to provision.

### 1a. Run the database migrations

1. In the left sidebar, open **SQL Editor**.
2. Open the file `supabase/migrations/0001_init.sql` from this repository, copy its full contents, paste into a new query, and click **Run**.
3. Repeat for `supabase/migrations/0002_rls.sql`.
4. Repeat for `supabase/migrations/0003_seed.sql`.
5. Open **Table Editor** and confirm you can see the tables (`organisation`, `workers`, `policies`, and so on) with the seed rows in `policies` and one sample row in `workers`.

### 1b. Create the documents storage bucket

1. In the sidebar, open **Storage**.
2. Click **New bucket**.
3. Name it exactly `documents`. Leave **Public** switched **off**. A private bucket is required: files are served only through short-lived signed links.
4. Click **Create bucket**.

### 1c. Copy your project keys

1. In the sidebar, open **Project Settings**, then **API**.
2. Copy two values, you will need them for Netlify:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long token). This one is safe for the browser, access is still governed by Row Level Security.
3. Leave the **service_role** key where it is for now. It is only needed in Phase 2 and must never go in the browser.

---

## Part 2. Create your first login

The app has no public sign-up by design. You create users yourself.

1. In Supabase, open **Authentication**, then **Users**, then **Add user**, then **Create new user**.
2. Enter your email and a password. Tick **Auto Confirm User** so you can sign in immediately.
3. Click **Create user**, then copy the new user's **UID** (shown in the user list).
4. Go back to **SQL Editor** and run this, pasting in your UID and email:

```sql
insert into app_users (id, email, full_name, role, is_active)
values ('PASTE-UID-HERE', 'you@example.com', 'David Lawrence', 'admin', true);
```

This links your login to an admin profile, which is what unlocks access under the security rules.

---

## Part 3. Deploy to Netlify (the app)

You can deploy straight from GitHub, which is the tidiest route.

### 3a. Put the code on GitHub

1. Create a new **private** repository on GitHub, for example `dl-compliance`.
2. Push this project to it. From the project folder:

```bash
git init
git add .
git commit -m "Phase 0: foundation"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/dl-compliance.git
git push -u origin main
```

### 3b. Connect Netlify

1. Go to **netlify.com** and sign in.
2. Click **Add new site**, then **Import an existing project**, then **GitHub**, and pick your `dl-compliance` repository.
3. Netlify reads `netlify.toml`, so the build command (`npm run build`) and publish directory (`dist`) are filled in already. Leave them.
4. Before the first deploy, open **Site configuration**, then **Environment variables**, and add:
   - `VITE_SUPABASE_URL` = your Project URL from step 1c
   - `VITE_SUPABASE_ANON_KEY` = your anon public key from step 1c
5. Trigger a deploy (**Deploys**, then **Trigger deploy**, then **Deploy site**).
6. When it finishes, open the site URL. You should see the login screen. Sign in with the user you created in Part 2.

---

## Part 4. First checks

Once signed in you should see:

- The **Dashboard** with the DL-CRS headline score, the six domain bars, and an alert for the sample worker's visa date.
- The **Policy Library** listing all twelve policies.
- The module pages in the sidebar, scaffolded and ready for Phase 1 build-out.

Then:

1. Open the sample worker and replace it with the real worker's details, or delete it once you add the real record.
2. Update the organisation row with your real sponsor licence number (run in SQL Editor, or via the settings screen once built):

```sql
update organisation
set sponsor_licence_no = 'YOUR-LICENCE-NO'
where company_number = '17211065';
```

---

## Turning on MFA (recommended before real data goes in)

1. In Supabase, open **Authentication**, then **Policies** / **Providers**, and enable **Multi-Factor Authentication (TOTP)**.
2. Each admin and Authorising Officer should enrol an authenticator app on next sign-in.

---

## Running costs

- **Netlify:** free tier is sufficient.
- **Supabase:** the free tier runs this. Move to **Pro** (about 25 US dollars a month) when you put real records in, for daily backups and point-in-time recovery. For records you must produce on inspection, backups are not optional.

---

## What comes next (Phase 1)

Build-out of the module screens: the Workers Register forms, Right to Work capture with automatic follow-up dates, absence entry with the 10 working day trigger, document upload to the `documents` bucket, acknowledgement capture, and the audit trail view. Then Phase 2 adds the reporting workflow, the SMS Copilot, the reminder emails, and the nightly DL-CRS recalculation.
