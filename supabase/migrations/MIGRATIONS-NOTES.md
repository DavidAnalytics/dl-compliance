# Migration notes — manual and out-of-band steps

The numbered `.sql` files are the schema history. A few operational steps were
applied directly to the live project and are recorded here so the setup is
fully reproducible from the repository.

## 1. Enum value (before 0017)

`ALTER TYPE ... ADD VALUE` cannot run in the same transaction that uses the new
value, so it is applied on its own, before migration 0017:

```sql
alter type alert_type add value if not exists 'leave_request';
```

## 2. Scheduled jobs (pg_cron)

Four nightly jobs run in the project. The two that call compute-only SQL are
created inside their migrations; the two that send email call an edge function
over HTTP with the project's **anon** key (publishable, not secret).

| Job                 | Schedule (UTC) | Action                                   |
|---------------------|----------------|------------------------------------------|
| nightly-backup      | `30 2 * * *`   | invoke `nightly-backup` edge function    |
| compute-crs         | `45 5 * * *`   | `select compute_crs();`                  |
| generate-alerts     | `0 6 * * *`    | `select generate_alerts();`              |
| alerts-digest-email | `15 6 * * *`   | invoke `alerts-digest` edge function     |

Edge-function jobs are scheduled like this (replace `<ANON_KEY>` with the
project anon key, and the slug/url with the target function):

```sql
select cron.schedule('nightly-backup', '30 2 * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/nightly-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);
```

## 3. Edge functions

Deployed to the Supabase project (sources under `supabase/functions/`):

- **alerts-digest** — nightly email of open alerts to the HR recipients in
  `settings.alert_emails`.
- **nightly-backup** — full table export emailed to `settings.backup_emails`,
  with a scheduled-job health summary from `job_health()`.

Both require the `RESEND_API_KEY` edge-function secret and send from
`settings.alert_from` (a Resend-verified sender on the company domain).

## 4. Supabase auth configuration (dashboard)

Password reset relies on Authentication → URL Configuration:

- Site URL: `https://app.dlbusinesssystems.com`
- Redirect URLs: `https://app.dlbusinesssystems.com/**`
