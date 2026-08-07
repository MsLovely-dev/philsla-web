import { describe, expect, it } from 'vitest';
import {
  backfillQrCode,
  computeScanStatus,
  DEFAULT_LATE_GRACE_MINUTES,
  formatLateDuration,
  matchScannedCodeToStudent,
  resolveScheduledStart,
  type ScannableStudent,
} from './qrAttendanceService';

function buildRoster(): ScannableStudent[] {
  return [
    { id: 'ST-001', name: 'Juan Carlos Villanueva', attendance: 'Pending', qrCode: 'SAMPLE_QR_ST-001' },
    { id: 'ST-002', name: 'Maria Cristina Santos', attendance: 'Present', qrCode: 'SAMPLE_QR_ST-002' },
    { id: 'ST-003', name: 'Enrique S. Gatus', attendance: 'Absent', qrCode: 'SAMPLE_QR_ST-003' },
  ];
}

describe('matchScannedCodeToStudent', () => {
  it('returns the matching student when the scanned value matches a qrCode in the roster', () => {
    const students = buildRoster();

    const result = matchScannedCodeToStudent('SAMPLE_QR_ST-001', students);

    expect(result).toEqual(students[0]);
  });

  it('returns null when no student in the roster has a matching qrCode', () => {
    const students = buildRoster();

    const result = matchScannedCodeToStudent('SAMPLE_QR_ST-999', students);

    expect(result).toBeNull();
  });

  it('returns null when the roster is empty', () => {
    const result = matchScannedCodeToStudent('SAMPLE_QR_ST-001', []);

    expect(result).toBeNull();
  });

  it('returns the matched student even when they are already Present, without special-casing attendance', () => {
    const students = buildRoster();

    const result = matchScannedCodeToStudent('SAMPLE_QR_ST-002', students);

    expect(result).toEqual(students[1]);
    expect(result?.attendance).toBe('Present');
  });
});

describe('backfillQrCode', () => {
  it('leaves an existing qrCode untouched', () => {
    const students = [{ id: 'ST-001', qrCode: 'CUSTOM_CODE' }];

    const result = backfillQrCode(students);

    expect(result[0].qrCode).toBe('CUSTOM_CODE');
  });

  it('fills in a deterministic qrCode when a record has none (e.g. a roster persisted by a page that does not know about qrCode)', () => {
    const students = [{ id: 'ST-001' }];

    const result = backfillQrCode(students);

    expect(result[0].qrCode).toBe('SAMPLE_QR_ST-001');
  });

  it('backfills each record independently in a mixed roster', () => {
    const students = [{ id: 'ST-001', qrCode: 'CUSTOM_CODE' }, { id: 'ST-002' }];

    const result = backfillQrCode(students);

    expect(result[0].qrCode).toBe('CUSTOM_CODE');
    expect(result[1].qrCode).toBe('SAMPLE_QR_ST-002');
  });
});

describe('resolveScheduledStart', () => {
  it('parses the mock schedule date + time fields into a single timestamp', () => {
    const result = resolveScheduledStart({ date: '2026-06-15', time: '08:00 AM' });

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // June, 0-indexed
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
  });

  it('parses a PM time correctly', () => {
    const result = resolveScheduledStart({ date: '2026-06-15', time: '01:30 PM' });

    expect(result.getHours()).toBe(13);
    expect(result.getMinutes()).toBe(30);
  });
});

describe('computeScanStatus', () => {
  const scheduledStart = new Date('2026-06-15T08:00:00');

  it('marks Present when scanned exactly at the grace boundary', () => {
    const scannedAt = new Date(scheduledStart.getTime() + DEFAULT_LATE_GRACE_MINUTES * 60_000);

    expect(computeScanStatus(scheduledStart, scannedAt, DEFAULT_LATE_GRACE_MINUTES)).toBe('PRESENT');
  });

  it('marks Present when scanned before the grace boundary', () => {
    const scannedAt = new Date(scheduledStart.getTime() + 5 * 60_000);

    expect(computeScanStatus(scheduledStart, scannedAt, DEFAULT_LATE_GRACE_MINUTES)).toBe('PRESENT');
  });

  it('marks Late when scanned after the grace boundary', () => {
    const scannedAt = new Date(scheduledStart.getTime() + DEFAULT_LATE_GRACE_MINUTES * 60_000 + 60_000);

    expect(computeScanStatus(scheduledStart, scannedAt, DEFAULT_LATE_GRACE_MINUTES)).toBe('LATE');
  });

  it('marks Present when scanned before the scheduled start at all', () => {
    const scannedAt = new Date(scheduledStart.getTime() - 10 * 60_000);

    expect(computeScanStatus(scheduledStart, scannedAt, DEFAULT_LATE_GRACE_MINUTES)).toBe('PRESENT');
  });
});

describe('formatLateDuration', () => {
  const scheduledStart = new Date('2026-06-15T08:00:00');
  const graceDeadline = new Date(scheduledStart.getTime() + DEFAULT_LATE_GRACE_MINUTES * 60_000);

  it('formats a delay of less than an hour as minutes only', () => {
    const scannedAt = new Date(graceDeadline.getTime() + 5 * 60_000);

    expect(formatLateDuration(graceDeadline, scannedAt)).toBe('5 min late');
  });

  it('formats a delay of exactly one hour with no leftover minutes', () => {
    const scannedAt = new Date(graceDeadline.getTime() + 60 * 60_000);

    expect(formatLateDuration(graceDeadline, scannedAt)).toBe('1 hr late');
  });

  it('formats a delay with both hours and minutes', () => {
    const scannedAt = new Date(graceDeadline.getTime() + 90 * 60_000);

    expect(formatLateDuration(graceDeadline, scannedAt)).toBe('1 hr 30 min late');
  });

  it('formats a delay of under a minute as "just now"', () => {
    const scannedAt = new Date(graceDeadline.getTime() + 10_000);

    expect(formatLateDuration(graceDeadline, scannedAt)).toBe('just now');
  });

  it('rolls a delay of 24+ hours up into days once it exceeds a full day', () => {
    const scannedAt = new Date(graceDeadline.getTime() + 24 * 60 * 60_000);

    expect(formatLateDuration(graceDeadline, scannedAt)).toBe('1 day late');
  });

  it('formats multiple days with leftover hours', () => {
    const scannedAt = new Date(graceDeadline.getTime() + (53 * 24 + 3) * 60 * 60_000);

    expect(formatLateDuration(graceDeadline, scannedAt)).toBe('53 days 3 hr late');
  });

  it('drops leftover hours from the days format when there are none', () => {
    const scannedAt = new Date(graceDeadline.getTime() + 2 * 24 * 60 * 60_000);

    expect(formatLateDuration(graceDeadline, scannedAt)).toBe('2 days late');
  });
});
