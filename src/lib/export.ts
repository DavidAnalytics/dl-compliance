// Client-side exports: CSV download and print-to-PDF for reports.

type Cell = string | number | null | undefined;

function esc(v: Cell): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCSV(filename: string, headers: string[], rows: Cell[][]) {
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Opens a print-ready window. The person chooses "Save as PDF" or prints.
export function printHTML(title: string, inner: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1f1b3a;margin:40px;font-size:13px;line-height:1.5}
      h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:22px 0 6px;border-bottom:2px solid #635BE5;padding-bottom:4px}
      .meta{color:#666;font-size:12px} table{width:100%;border-collapse:collapse;margin-top:6px}
      th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:top} th{background:#f4f4fb;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#555}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 18px;margin-top:6px}
      .fld .l{font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:#888} .fld .v{font-weight:600}
      .foot{color:#888;font-size:11px;margin-top:28px;border-top:1px solid #eee;padding-top:10px}
      @media print{body{margin:16mm}}
    </style></head><body>${inner}
    <p class="foot">DL Business Systems Ltd · internal record-keeping system. Not a substitute for legal advice.</p>
    </body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 300); }
}

export const field = (l: string, v: Cell) => `<div class="fld"><div class="l">${l}</div><div class="v">${v == null || v === '' ? '—' : v}</div></div>`;
export const table = (head: string[], rows: Cell[][], empty = 'None recorded') =>
  rows.length === 0
    ? `<p class="meta">${empty}</p>`
    : `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c == null || c === '' ? '—' : c}</td>`).join('')}</tr>`).join('')}</table>`;
