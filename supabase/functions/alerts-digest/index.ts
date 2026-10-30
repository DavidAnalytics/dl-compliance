import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (_req: Request) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const sres = await supabase.from("settings").select("alert_emails, alert_from").limit(1).maybeSingle();
  const settings = sres.data as { alert_emails?: string[]; alert_from?: string } | null;
  const recipients: string[] = settings?.alert_emails ?? [];
  const from: string = settings?.alert_from ?? "onboarding@resend.dev";

  const ares = await supabase.from("alerts").select("severity,title,detail,due_date").eq("status", "open").order("due_date", { ascending: true });
  const alerts = (ares.data as any[]) ?? [];

  const diag = { serviceKeyPresent: serviceKey.length > 0, settingsError: sres.error?.message ?? null, alertsError: ares.error?.message ?? null, recipientCount: recipients.length, alertCount: alerts.length };

  if (!recipients.length) return json({ skipped: "no recipients configured", diag });
  if (!alerts.length) return json({ skipped: "no open alerts", diag });
  if (!resendKey) return json({ error: "RESEND_API_KEY not set", diag }, 500);

  const rows = alerts.map((a: any) =>
    `<tr><td style="padding:8px 10px;border-bottom:1px solid #eee">${a.severity === "red" ? "\u{1F534}" : "\u{1F7E0}"} ${a.title}</td><td style="padding:8px 10px;border-bottom:1px solid #eee">${a.detail ?? ""}</td><td style="padding:8px 10px;border-bottom:1px solid #eee">${a.due_date ?? ""}</td></tr>`
  ).join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f1b3a;max-width:640px"><h2 style="color:#514ad6">DL Compliance — daily alert digest</h2><p>${alerts.length} item(s) need attention.</p><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#f4f4fb"><th align="left" style="padding:8px 10px">Alert</th><th align="left" style="padding:8px 10px">Detail</th><th align="left" style="padding:8px 10px">Due</th></tr>${rows}</table><p style="color:#888;font-size:12px;margin-top:20px">DL Business Systems Ltd · internal system. Not a substitute for legal advice.</p></div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `DL Compliance <${from}>`, to: recipients, subject: `DL Compliance: ${alerts.length} item(s) need attention`, html }),
  });
  const body = await res.json().catch(() => ({}));
  return json({ sent: res.ok, recipients, count: alerts.length, resend: body, diag }, res.ok ? 200 : 500);
});
