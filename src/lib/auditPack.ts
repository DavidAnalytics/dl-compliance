// Comprehensive sponsor-compliance audit pack generator.
// Assembles a paginated, inspection-ready HTML document from live data and
// opens it in a print window (save as PDF). Structured around the five UKVI
// compliance assessment areas.

import { formatDate, formatMoney, daysUntil, fullName } from '@/lib/compliance';

type Row = Record<string, unknown>;
export interface AuditInput {
  org: Row | null;
  workers: Row[];            // non-left workers
  checks: Row[];             // right_to_work_checks, newest first
  reqDocs: Row[];            // required_documents
  documents: Row[];          // documents (inventory)
  absences: Row[];           // absences
  events: Row[];             // reportable_events
  keyPersonnel: Row[];       // key_personnel
  rates: Row[];              // soc_going_rates
  snapshot: Row | null;      // latest crs_snapshot
}

const today = new Date().toISOString().slice(0, 10);
const pct = (num: number, den: number) => (den <= 0 ? 100 : Math.round((100 * num) / den));
const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
const rag = (s: number) => (s >= 90 ? '#1a9e5f' : s >= 60 ? '#d08b1d' : '#c0392b');
const dash = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : esc(v));

function ring(score: number, label: string) {
  const r = 34, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  return `<div class="ring"><svg width="92" height="92" viewBox="0 0 92 92">
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="#ececf3" stroke-width="9"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="${rag(score)}" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 46 46)"/>
    <text x="46" y="52" text-anchor="middle" font-size="19" font-weight="700" fill="#1f1b3a">${score}%</text>
  </svg><p class="ringlabel">${esc(label)}</p></div>`;
}

const tbl = (head: string[], rows: string[][], empty = 'None recorded') =>
  rows.length === 0 ? `<p class="muted">${empty}</p>`
    : `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

export function generateAuditPack(d: AuditInput) {
  const org = d.org ?? {};
  const sponsored = d.workers.filter((w) => w.sponsorship_type === 'sponsored' && w.employment_status !== 'left');
  const n = sponsored.length;
  const checksByWorker: Record<string, Row[]> = {};
  for (const c of d.checks) (checksByWorker[c.worker_id as string] ??= []).push(c);
  const rateFor = (soc: unknown) => d.rates.find((r) => r.soc_code === soc);
  const reqFor = (wid: string) => d.reqDocs.filter((r) => r.worker_id === wid);

  // ---- Five UKVI area scores -------------------------------------------------
  const piw = pct(sponsored.filter((w) => {
    const latest = (checksByWorker[w.id as string] ?? [])[0];
    const visaOk = !w.visa_expiry || (w.visa_expiry as string) >= today;
    const excuseOk = !latest || !latest.excuse_expiry || (latest.excuse_expiry as string) >= today;
    return latest && latest.outcome !== 'fail' && visaOk && excuseOk;
  }).length, n);

  const recKeeping = Math.round((sponsored.reduce((acc, w) => {
    const req = reqFor(w.id as string).filter((r) => r.required);
    if (req.length === 0) return acc + 0;
    return acc + (100 * req.filter((r) => r.status === 'present').length) / req.length;
  }, 0)) / Math.max(n, 1));

  const contact = pct(sponsored.filter((w) => w.personal_email && w.personal_phone && w.home_address).length, n);

  const monitoring = pct(sponsored.filter((w) => {
    const visaOk = !w.visa_expiry || (w.visa_expiry as string) >= today;
    const noReportableAbs = !d.absences.some((a) => a.worker_id === w.id && a.reportable);
    return visaOk && noReportableAbs;
  }).length, n);

  const roles = ['authorising_officer', 'key_contact', 'level_1_user'];
  const governance = Math.round((100 * roles.filter((r) => d.keyPersonnel.some((k) => k.sms_role === r)).length) / 3);
  const overdueReports = d.events.filter((e) => e.status === 'due' && (e.deadline as string) < today).length;
  const reporting = Math.max(0, 100 - 25 * overdueReports);
  const salaryOk = pct(sponsored.filter((w) => {
    const rt = rateFor(w.soc_code); const gr = rt?.going_rate_annual as number | undefined;
    return !gr || (w.annual_salary as number) >= gr;
  }).length, n);
  const generalDuties = Math.round((governance + reporting + salaryOk) / 3);

  const areas = [
    { key: 'Preventing Illegal Working', score: piw },
    { key: 'Record Keeping', score: recKeeping },
    { key: 'Contact Details', score: contact },
    { key: 'Tracking & Monitoring', score: monitoring },
    { key: 'General Sponsor Duties', score: generalDuties },
  ];
  const overall = Math.round(areas.reduce((a, x) => a + x.score, 0) / areas.length);
  const areasMet = areas.filter((a) => a.score >= 90).length;

  // ---- Worker risk + open issues --------------------------------------------
  const riskOf = (w: Row): 'High' | 'Medium' | 'Low' => {
    const latest = (checksByWorker[w.id as string] ?? [])[0];
    const visaDays = daysUntil((w.visa_expiry as string) ?? null);
    const followDays = daysUntil((latest?.excuse_expiry as string) ?? (latest?.follow_up_due as string) ?? null);
    const missing = reqFor(w.id as string).filter((r) => r.required && r.status !== 'present').length;
    if (!latest || latest.outcome === 'fail' || (visaDays !== null && visaDays < 0) || (followDays !== null && followDays < 0)) return 'High';
    if ((visaDays !== null && visaDays <= 90) || missing > 0 || (followDays !== null && followDays <= 30)) return 'Medium';
    return 'Low';
  };
  const riskRank = { High: 0, Medium: 1, Low: 2 } as const;
  const ranked = [...sponsored].sort((a, b) => riskRank[riskOf(a)] - riskRank[riskOf(b)]);

  const issues: { area: string; issue: string; sev: string; action: string }[] = [];
  for (const w of sponsored) {
    const name = fullName(w as never);
    const latest = (checksByWorker[w.id as string] ?? [])[0];
    const visaDays = daysUntil((w.visa_expiry as string) ?? null);
    if (!latest) issues.push({ area: 'Preventing Illegal Working', issue: `${name}: no right to work check on file`, sev: 'Critical', action: 'Run a guided right to work check' });
    else if (latest.outcome === 'fail') issues.push({ area: 'Preventing Illegal Working', issue: `${name}: last right to work check failed`, sev: 'Critical', action: 'Do not employ until a valid check is obtained' });
    if (visaDays !== null && visaDays < 0) issues.push({ area: 'Preventing Illegal Working', issue: `${name}: visa has expired`, sev: 'Critical', action: 'Stop work and report; verify current status' });
    else if (visaDays !== null && visaDays <= 90) issues.push({ area: 'Tracking & Monitoring', issue: `${name}: visa expires in ${visaDays} days`, sev: 'Attention', action: 'Schedule a follow-up right to work check' });
    const missing = reqFor(w.id as string).filter((r) => r.required && r.status !== 'present');
    if (missing.length) issues.push({ area: 'Record Keeping', issue: `${name}: ${missing.length} required document(s) missing`, sev: 'Attention', action: 'Upload the missing Appendix D documents' });
    const rt = rateFor(w.soc_code); const gr = rt?.going_rate_annual as number | undefined;
    if (gr && (w.annual_salary as number) < gr) issues.push({ area: 'General Sponsor Duties', issue: `${name}: salary below the going rate`, sev: 'Critical', action: 'Review salary against the going rate for the SOC code' });
  }
  for (const r of roles) if (!d.keyPersonnel.some((k) => k.sms_role === r)) issues.push({ area: 'General Sponsor Duties', issue: `No ${r.replace(/_/g, ' ')} named`, sev: 'Attention', action: 'Appoint and record this key personnel role' });
  for (const e of d.events.filter((e) => e.status === 'due' && (e.deadline as string) < today)) issues.push({ area: 'General Sponsor Duties', issue: `Overdue report: ${String(e.event_type).replace(/_/g, ' ')}`, sev: 'Critical', action: 'Report via the SMS without further delay' });
  const critical = issues.filter((i) => i.sev === 'Critical').length;
  const ready = overall >= 90 && critical === 0;

  // ---- Appendix D completeness grid -----------------------------------------
  const docLabels = Array.from(new Set(d.reqDocs.map((r) => r.label as string))).sort();
  const cell = (s: unknown) => {
    const map: Record<string, string> = { present: '#1a9e5f', missing: '#c0392b', expiring: '#d08b1d', expired: '#c0392b' };
    const col = map[s as string] ?? '#bbb';
    return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col}"></span>`;
  };

  // ---- HTML ------------------------------------------------------------------
  const coverMeta = `${esc(org.legal_name ?? 'DL Business Systems Ltd')}<br/>Company number ${esc(org.company_number ?? '—')}<br/>`
    + `Sponsor licence ${esc(org.sponsor_licence_no ?? '—')} · ${esc(org.licence_rating ?? '—')} · ${esc(org.licence_route ?? '—')}`;

  const perWorker = ranked.map((w) => {
    const hist = (checksByWorker[w.id as string] ?? []);
    const rt = rateFor(w.soc_code);
    return `<section class="page">
      <h2>Worker record — ${esc(fullName(w as never))}</h2>
      <div class="grid">
        ${fld('Nationality', w.nationality)}${fld('Visa type', w.visa_type)}${fld('Visa expiry', formatDate((w.visa_expiry as string) ?? null))}
        ${fld('Start date', formatDate((w.start_date as string) ?? null))}${fld('CoS reference', w.cos_reference)}${fld('SOC code', w.soc_code)}
        ${fld('Salary', w.annual_salary != null ? formatMoney(w.annual_salary as number) : null)}${fld('Going rate', rt?.going_rate_annual ? formatMoney(rt.going_rate_annual as number) : 'Not set')}${fld('Risk level', riskOf(w))}
      </div>
      <h3>Right to Work check history</h3>
      ${tbl(['Date', 'Method', 'Evidence', 'Excuse', 'Follow-up due', 'Outcome'],
        hist.map((c) => [dash(formatDate(c.checked_on as string)), dash(String(c.method).replace(/_/g, ' ')), dash(c.share_code), dash(String(c.excuse_type).replace(/_/g, ' ')), dash(formatDate((c.excuse_expiry as string) ?? (c.follow_up_due as string) ?? null)), dash(String(c.outcome).replace(/_/g, ' '))]),
        'No checks recorded')}
    </section>`;
  }).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Compliance Audit Pack — ${esc(org.legal_name ?? 'DL Business Systems Ltd')}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1f1b3a;margin:0;font-size:12.5px;line-height:1.5}
    .wrap{max-width:820px;margin:0 auto;padding:34px}
    h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:0 0 10px;color:#514ad6} h3{font-size:13px;margin:16px 0 4px}
    .muted{color:#888} .meta{color:#666;font-size:11.5px}
    table{width:100%;border-collapse:collapse;margin-top:6px;font-size:11.5px} th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e6e6ee;vertical-align:top}
    th{background:#f4f4fb;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:#555}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px 16px;margin-top:6px}
    .fld .l{font-size:9.5px;text-transform:uppercase;letter-spacing:.03em;color:#8a8a9a} .fld .v{font-weight:600}
    .rings{display:flex;gap:6px;justify-content:space-between;margin:14px 0} .ring{text-align:center;flex:1} .ringlabel{font-size:9.5px;color:#666;margin:4px 0 0}
    .bar{height:12px;border-radius:7px;background:#ececf3;overflow:hidden;margin-top:4px} .bar > span{display:block;height:100%;border-radius:7px}
    .verdict{border-radius:10px;padding:12px 14px;margin:12px 0;font-weight:700}
    .cover{background:#1b1636;color:#fff;border-radius:14px;padding:70px 40px;text-align:center;margin-bottom:26px}
    .cover .tag{letter-spacing:.2em;font-size:11px;color:#b9b2e8;text-transform:uppercase} .cover h1{color:#fff;margin:14px 0 18px;font-size:28px} .cover .meta{color:#c9c4e8}
    .page{page-break-before:always;padding-top:8px} .pill{display:inline-block;padding:1px 7px;border-radius:9px;font-size:10px;font-weight:700}
    .contents li{margin:3px 0}
    @media print{.wrap{max-width:none;padding:14mm} .cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    @media print{table,th,td,.verdict,.bar,.cover,.ring svg circle{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><div class="wrap">

  <div class="cover">
    <p class="tag">Compliance Audit Pack</p>
    <h1>${esc(org.legal_name ?? 'DL Business Systems Ltd')}</h1>
    <p class="meta">${coverMeta}<br/><br/>Generated ${new Date().toLocaleString('en-GB')}</p>
  </div>

  <h2>Contents</h2>
  <ol class="contents">
    <li>Inspection readiness summary</li>
    <li>Worker risk ranking</li>
    <li>Worker records and right to work history</li>
    <li>Appendix D document completeness</li>
    <li>Document inventory</li>
    <li>Contact details audit</li>
    <li>Absence monitoring</li>
    <li>Salary compliance</li>
    <li>Certificate of Sponsorship register</li>
    <li>Key personnel and general sponsor duties</li>
    <li>Open issues and remediation tracker</li>
  </ol>

  <section class="page">
    <h2>1. Inspection readiness summary</h2>
    <div class="verdict" style="background:${ready ? '#eafaf0' : '#fdecec'};color:${ready ? '#1a7f4b' : '#c0392b'}">
      Inspection readiness: ${ready ? 'READY' : 'NOT READY'} — ${critical} critical issue(s), ${areasMet}/5 areas met
    </div>
    <div class="rings">${areas.map((a) => ring(a.score, a.key)).join('')}</div>
    ${tbl(['UKVI compliance area', 'Score', 'Status'], areas.map((a) => [esc(a.key), `${a.score}%`, a.score >= 90 ? '<span class="pill" style="background:#eafaf0;color:#1a7f4b">MET</span>' : '<span class="pill" style="background:#fdecec;color:#c0392b">NEEDS WORK</span>']))}
    <h3>Overall compliance score</h3>
    <div class="bar"><span style="width:${overall}%;background:${rag(overall)}"></span></div>
    <p class="meta" style="margin-top:4px">${overall}% overall${d.snapshot ? ` · readiness score on record: ${esc(d.snapshot.overall_score)} / 100` : ''}</p>
  </section>

  <section class="page">
    <h2>2. Worker risk ranking</h2>
    ${tbl(['#', 'Worker', 'Visa type', 'Visa expiry', 'Risk level'],
      ranked.map((w, i) => {
        const risk = riskOf(w); const col = risk === 'High' ? '#c0392b' : risk === 'Medium' ? '#d08b1d' : '#1a7f4b';
        return [String(i + 1), esc(fullName(w as never)), dash(w.visa_type), dash(formatDate((w.visa_expiry as string) ?? null)), `<span style="color:${col};font-weight:700">${risk}</span>`];
      }), 'No sponsored workers on record')}
  </section>

  ${perWorker}

  <section class="page">
    <h2>4. Appendix D document completeness</h2>
    <table><thead><tr><th>Worker</th>${docLabels.map((l) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>
    ${sponsored.map((w) => `<tr><td>${esc(fullName(w as never))}</td>${docLabels.map((l) => { const rd = reqFor(w.id as string).find((r) => r.label === l); return `<td style="text-align:center">${rd ? cell(rd.status) : '—'}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table>
    <p class="meta" style="margin-top:6px">Present (green), expiring (amber), missing or expired (red).</p>
  </section>

  <section class="page">
    <h2>5. Document inventory</h2>
    ${tbl(['Document', 'Category', 'Worker', 'Retention until'],
      d.documents.map((doc) => { const w = d.workers.find((x) => x.id === doc.worker_id); return [dash(doc.title), dash(doc.category), w ? esc(fullName(w as never)) : 'Organisation', dash(formatDate((doc.retention_until as string) ?? null))]; }),
      'No documents on file')}
  </section>

  <section class="page">
    <h2>6. Contact details audit</h2>
    ${tbl(['Worker', 'Email', 'Phone', 'Home address', 'Complete'],
      sponsored.map((w) => { const ok = !!(w.personal_email && w.personal_phone && w.home_address); return [esc(fullName(w as never)), dash(w.personal_email), dash(w.personal_phone), w.home_address ? 'On file' : '<span style="color:#c0392b">Missing</span>', ok ? '<span style="color:#1a7f4b">Yes</span>' : '<span style="color:#c0392b">No</span>']; }))}
  </section>

  <section class="page">
    <h2>7. Absence monitoring</h2>
    ${tbl(['Worker', 'Type', 'From', 'To', 'Working days', 'Reportable'],
      d.absences.map((a) => { const w = d.workers.find((x) => x.id === a.worker_id); return [w ? esc(fullName(w as never)) : '—', dash(String(a.absence_type).replace(/_/g, ' ')), dash(formatDate(a.start_date as string)), dash(formatDate(a.end_date as string)), dash(a.working_days), a.reportable ? '<span style="color:#c0392b">Yes</span>' : 'No']; }),
      'No absences recorded')}
  </section>

  <section class="page">
    <h2>8. Salary compliance</h2>
    ${tbl(['Worker', 'SOC code', 'Going rate', 'Actual salary', 'Compliant'],
      sponsored.map((w) => { const rt = rateFor(w.soc_code); const gr = rt?.going_rate_annual as number | undefined; const ok = !gr || (w.annual_salary as number) >= gr;
        return [esc(fullName(w as never)), dash(w.soc_code), gr ? formatMoney(gr) : 'Not set', w.annual_salary != null ? formatMoney(w.annual_salary as number) : '—', gr ? (ok ? '<span style="color:#1a7f4b">Yes</span>' : '<span style="color:#c0392b">Below</span>') : '—']; }))}
  </section>

  <section class="page">
    <h2>9. Certificate of Sponsorship register</h2>
    ${tbl(['Worker', 'CoS reference', 'Visa type', 'Start date', 'SOC code', 'Salary'],
      sponsored.map((w) => [esc(fullName(w as never)), dash(w.cos_reference), dash(w.visa_type), dash(formatDate((w.start_date as string) ?? null)), dash(w.soc_code), w.annual_salary != null ? formatMoney(w.annual_salary as number) : '—']))}
  </section>

  <section class="page">
    <h2>10. Key personnel and general sponsor duties</h2>
    <h3>Key personnel</h3>
    ${tbl(['SMS role', 'Name', 'Email', 'Last SMS login'],
      d.keyPersonnel.map((k) => [dash(String(k.sms_role).replace(/_/g, ' ')), dash(k.full_name), dash(k.email), dash(formatDate((k.last_sms_login as string) ?? null))]), 'No key personnel recorded')}
    <h3>General sponsor duties</h3>
    ${tbl(['Duty', 'Status'], [
      ['Authorising Officer, Key Contact and Level 1 User appointed', governance === 100 ? '<span style="color:#1a7f4b">Met</span>' : '<span style="color:#c0392b">Incomplete</span>'],
      ['Reportable events reported within deadline', overdueReports === 0 ? '<span style="color:#1a7f4b">Met</span>' : `<span style="color:#c0392b">${overdueReports} overdue</span>`],
      ['Salaries meet the going rate', salaryOk === 100 ? '<span style="color:#1a7f4b">Met</span>' : '<span style="color:#d08b1d">Review needed</span>'],
      ['Record keeping complete (Appendix D)', recKeeping >= 90 ? '<span style="color:#1a7f4b">Met</span>' : '<span style="color:#d08b1d">Gaps present</span>'],
    ])}
  </section>

  <section class="page">
    <h2>11. Open issues and remediation tracker</h2>
    ${tbl(['Area', 'Issue', 'Severity', 'Remediation'],
      issues.map((i) => [esc(i.area), esc(i.issue), i.sev === 'Critical' ? '<span style="color:#c0392b;font-weight:700">Critical</span>' : '<span style="color:#d08b1d;font-weight:700">Attention</span>', esc(i.action)]),
      'No open issues. All areas within tolerance.')}
    <p class="meta" style="margin-top:22px">${esc(org.legal_name ?? 'DL Business Systems Ltd')} · internal record-keeping system. Not a substitute for legal advice. Generated ${new Date().toLocaleString('en-GB')}.</p>
  </section>

  </div></body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
}

function fld(l: string, v: unknown) {
  return `<div class="fld"><div class="l">${esc(l)}</div><div class="v">${v === null || v === undefined || v === '' ? '—' : esc(v)}</div></div>`;
}
