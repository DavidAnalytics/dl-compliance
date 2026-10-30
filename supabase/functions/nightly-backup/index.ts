import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

const TABLES = [
  "organisation", "departments", "workers", "app_users", "key_personnel",
  "soc_going_rates", "leave_types", "leave_entitlements", "bank_holidays",
  "right_to_work_checks", "dbs_checks", "documents", "required_documents",
  "reportable_events", "absences", "leave_requests", "role_eligibility_reviews",
  "policies", "announcements", "alerts", "crs_snapshots", "audit_log",
];

Deno.serve(async (_req: Request) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const sres = await supabase.from("settings").select("backup_emails, alert_from").limit(1).maybeSingle();
  const settings = sres.data as { backup_emails?: string[]; alert_from?: string } | null;
  const recipients: string[] = settings?.backup_emails ?? [];
  const from: string = settings?.alert_from ?? "onboarding@resend.dev";

  // Export every table
  const dump: Record<string, unknown> = { generated_at: new Date().toISOString() };
  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) { errors[t] = error.message; continue; }
    dump[t] = data ?? [];
    counts[t] = (data ?? []).length;
  }
  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  // Job health
  const hres = await supabase.rpc("job_health");
  const jobs = (hres.data as { job: string; schedule: string; last_status: string | null; last_run: string | null; healthy: boolean }[]) ?? [];
  const unhealthy = jobs.filter((j) => !j.healthy);

  const today = new Date().toISOString().slice(0, 10);
  const diag = { serviceKeyPresent: serviceKey.length > 0, recipientCount: recipients.length, totalRows, exportErrors: errors, jobHealthError: hres.error?.message ?? null };

  if (!recipients.length) return json({ skipped: "no backup recipients configured", diag });
  if (!resendKey) return json({ error: "RESEND_API_KEY not set", diag }, 500);

  const jsonStr = JSON.stringify(dump, null, 2);
  const attachment = encodeBase64(new TextEncoder().encode(jsonStr));

  const jobRows = jobs.map((j) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${j.healthy ? "✅" : "⚠️"} ${j.job}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${j.last_status ?? "not run yet"}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${j.last_run ? new Date(j.last_run).toLocaleString("en-GB") : "—"}</td></tr>`
  ).join("");
  const countRows = Object.entries(counts).map(([t, n]) =>
    `<tr><td style="padding:4px 10px">${t}</td><td style="padding:4px 10px" align="right">${n}</td></tr>`
  ).join("");

  const warnBanner = unhealthy.length
    ? `<div style="background:#fdecec;border:1px solid #f5c2c2;border-radius:10px;padding:12px 14px;margin:0 0 16px"><b style="color:#c0392b">Attention:</b> ${unhealthy.length} scheduled job(s) did not run as expected: ${unhealthy.map((j) => j.job).join(", ")}.</div>`
    : `<div style="background:#eafaf0;border:1px solid #bfe8cf;border-radius:10px;padding:12px 14px;margin:0 0 16px">All scheduled jobs ran successfully.</div>`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f1b3a;max-width:640px">
    <h2 style="color:#514ad6">DL backup &amp; systems check</h2>
    <p>${today} — a full export of your data is attached (${totalRows} records across ${Object.keys(counts).length} tables).</p>
    ${warnBanner}
    <h3 style="margin:18px 0 6px">Scheduled jobs</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px"><tr style="background:#f4f4fb"><th align="left" style="padding:6px 10px">Job</th><th align="left" style="padding:6px 10px">Last status</th><th align="left" style="padding:6px 10px">Last run</th></tr>${jobRows}</table>
    <h3 style="margin:18px 0 6px">Records backed up</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px">${countRows}</table>
    <p style="color:#888;font-size:12px;margin-top:20px">DL Business Systems Ltd · automated nightly backup. Keep this email: the attachment is a restorable copy of your data.</p>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `DL Systems <${from}>`,
      to: recipients,
      subject: `DL backup & systems check — ${today}${unhealthy.length ? " ⚠️" : ""}`,
      html,
      attachments: [{ filename: `dl-backup-${today}.json`, content: attachment }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  return json({ sent: res.ok, recipients, totalRows, unhealthy: unhealthy.map((j) => j.job), resend: body, diag }, res.ok ? 200 : 500);
});
