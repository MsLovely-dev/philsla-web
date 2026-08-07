/**
 * Safe CSV construction and download.
 *
 * Two classes of defect this guards against, both reachable from free-text
 * registry fields (university/school/program names, president, etc.):
 *  - CSV formula injection: a cell beginning with = + - @ (or tab/CR) is
 *    interpreted as a formula by Excel/Google Sheets and can execute
 *    (data exfiltration via HYPERLINK, DDE command execution). We neutralize
 *    it by prefixing a single quote so the spreadsheet treats it as literal text.
 *  - Malformed quoting: RFC 4180 requires embedded double-quotes to be doubled
 *    and any field containing a quote/comma/newline to be wrapped in quotes.
 */

// Leading characters a spreadsheet may treat as the start of a formula.
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

export function csvEscape(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);

  // Neutralize formula injection before any quoting.
  if (text.length > 0 && FORMULA_TRIGGERS.has(text[0])) {
    text = `'${text}`;
  }

  // RFC 4180 quoting.
  if (/["\n\r,]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  return lines.join('\r\n');
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, csv: string): void {
  // Prepend a UTF-8 BOM so Excel detects the encoding correctly.
  downloadBlob(filename, new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' }));
}
