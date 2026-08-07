import { describe, expect, it } from 'vitest';
import { csvEscape, parseCsv, toCsv } from './csvExportService';

describe('csvEscape', () => {
  it('neutralizes formula-injection leading characters', () => {
    expect(csvEscape('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvEscape('+1')).toBe("'+1");
    expect(csvEscape('-cmd')).toBe("'-cmd");
    expect(csvEscape('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('doubles embedded quotes and wraps fields with quotes/commas/newlines', () => {
    expect(csvEscape('San Beda "Red Lions"')).toBe('"San Beda ""Red Lions"""');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('leaves plain values untouched and coerces nullish to empty', () => {
    expect(csvEscape('UNI-00001')).toBe('UNI-00001');
    expect(csvEscape(1908)).toBe('1908');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('builds a header + rows CSV with CRLF line endings and per-cell escaping', () => {
    const csv = toCsv(['Code', 'Name'], [
      ['UNI-1', 'A, B'],
      ['UNI-2', '=x'],
    ]);
    expect(csv).toBe('Code,Name\r\nUNI-1,"A, B"\r\nUNI-2,\'=x');
  });
});

describe('parseCsv', () => {
  it('parses a simple CRLF file into trimmed headers and rows', () => {
    const { headers, rows } = parseCsv('Name,Region\r\nUP Diliman,NCR\r\nAteneo,NCR\r\n');
    expect(headers).toEqual(['Name', 'Region']);
    expect(rows).toEqual([
      ['UP Diliman', 'NCR'],
      ['Ateneo', 'NCR'],
    ]);
  });

  it('handles quoted fields with embedded commas, quotes, and newlines', () => {
    const { rows } = parseCsv('Name,Note\n"A, B","say ""hi"""\n"line1\nline2",ok');
    expect(rows[0]).toEqual(['A, B', 'say "hi"']);
    expect(rows[1]).toEqual(['line1\nline2', 'ok']);
  });

  it('strips a UTF-8 BOM and ignores blank lines', () => {
    const { headers, rows } = parseCsv('﻿Name,Region\nUP,NCR\n\n');
    expect(headers).toEqual(['Name', 'Region']);
    expect(rows).toEqual([['UP', 'NCR']]);
  });

  it('round-trips values written by toCsv', () => {
    const csv = toCsv(['Name', 'City'], [['A, B', 'Quezon City']]);
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['Name', 'City']);
    expect(rows).toEqual([['A, B', 'Quezon City']]);
  });
});
