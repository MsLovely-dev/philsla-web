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

/**
 * Parse CSV text into a header row and data rows (RFC 4180: quoted fields,
 * embedded commas/quotes/newlines, `""` escaping, CRLF or LF line endings).
 * A leading UTF-8 BOM and fully-blank lines are ignored. Headers are trimmed.
 * The inverse of {@link toCsv}; used to preview a file before bulk import.
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n') {
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  const [headers = [], ...rows] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows };
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
