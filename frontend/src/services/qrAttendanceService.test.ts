import { describe, expect, it } from 'vitest';
import { matchScannedCodeToStudent, type ScannableStudent } from './qrAttendanceService';

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
