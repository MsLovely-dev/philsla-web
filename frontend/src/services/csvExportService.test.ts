import { describe, expect, it } from 'vitest';
import { csvEscape, toCsv } from './csvExportService';

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
