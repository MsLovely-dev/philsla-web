import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import {
  buildApplicationReviewExportRows,
  createApplicationReviewWorkbook,
  type ApplicationReviewExportSource,
} from './applicationReviewExportService';

const application: ApplicationReviewExportSource = {
  candidateId: 'PHL-2026-SYN001',
  applicantName: 'Synthetic Applicant',
  status: 'PENDING',
  submittedAt: '2026-08-06T02:00:00.000Z',
  schoolId: '301234',
  schoolName: 'Synthetic National High School',
  mobile: '09170000000',
  email: 'student@example.test',
  preferredUniversity: 'Synthetic University',
  preferredCourse: 'BS Space Systems',
};

describe('applicationReviewExportService', () => {
  it('maps application review records for reviewer batch export', () => {
    const [row] = buildApplicationReviewExportRows([application]);

    expect(row).toEqual(expect.objectContaining({
      candidateId: 'PHL-2026-SYN001',
      applicantName: 'Synthetic Applicant',
      status: 'PENDING',
      schoolId: '301234',
      schoolName: 'Synthetic National High School',
    }));
  });

  it('creates a valid XLSX package with filtered application data', async () => {
    const rows = buildApplicationReviewExportRows([application]);
    const workbook = unzipSync(await createApplicationReviewWorkbook(rows));
    const worksheet = strFromU8(workbook['xl/worksheets/sheet1.xml']);

    expect(workbook['[Content_Types].xml']).toBeDefined();
    expect(workbook['xl/workbook.xml']).toBeDefined();
    expect(worksheet).toContain('Synthetic Applicant');
    expect(worksheet).toContain('Synthetic National High School');
  });
});
