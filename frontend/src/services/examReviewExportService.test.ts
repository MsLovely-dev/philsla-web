import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import {
  buildExamReviewExportRows,
  createExamReviewPdf,
  createExamReviewWorkbook,
  exportExamReviewBatch,
  type ExamReviewExportSource,
} from './examReviewExportService';

const attempt: ExamReviewExportSource = {
  candidateId: 'SYNTH-CANDIDATE-001',
  candidateName: 'Synthetic Candidate',
  submittedAt: '2026-08-03T02:00:00.000Z',
  totalScore: 40,
  maxScore: 50,
  status: 'PENDING',
  pendingSubjectiveItems: 1,
};

describe('examReviewExportService', () => {
  it('maps persisted review records without answer content', () => {
    const [row] = buildExamReviewExportRows([attempt]);

    expect(row).toEqual(expect.objectContaining({
      candidateId: 'SYNTH-CANDIDATE-001',
      examinee: 'Synthetic Candidate',
      score: '40 / 50',
      status: 'PENDING',
      manualReview: 'Required',
    }));
    expect(Object.keys(row)).not.toContain('responses');
  });

  it('marks records without pending subjective items complete', () => {
    const [row] = buildExamReviewExportRows([{ ...attempt, pendingSubjectiveItems: 0 }]);
    expect(row.manualReview).toBe('Complete');
  });

  it('rejects empty exports before loading a file generator', async () => {
    await expect(exportExamReviewBatch([], 'PDF')).rejects.toThrow('There are no exam review records to export.');
  });

  it('creates a valid XLSX package with the filtered review data', async () => {
    const rows = buildExamReviewExportRows([attempt]);
    const workbook = unzipSync(await createExamReviewWorkbook(rows));
    const worksheet = strFromU8(workbook['xl/worksheets/sheet1.xml']);

    expect(workbook['[Content_Types].xml']).toBeDefined();
    expect(workbook['xl/workbook.xml']).toBeDefined();
    expect(worksheet).toContain('Synthetic Candidate');
    expect(worksheet).toContain('40 / 50');
  });

  it('creates a non-empty PDF document', async () => {
    const pdf = await createExamReviewPdf(buildExamReviewExportRows([attempt]));
    expect(pdf.type).toBe('application/pdf');
    expect(pdf.size).toBeGreaterThan(1000);
  });
});
