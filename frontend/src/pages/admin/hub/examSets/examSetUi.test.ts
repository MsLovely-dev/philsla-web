import { describe, expect, it } from 'vitest';
import type { ExamSetRecord } from '../../../../services/backendExamSetService';
import { nextTransitions, recordToDraft, statusLabel } from './examSetUi';

describe('examSetUi', () => {
  it('formats status labels with spaces', () => {
    expect(statusLabel('ACADEMIC_REVIEW')).toBe('ACADEMIC REVIEW');
  });

  it('returns the approve/request-revision pair for ACADEMIC_REVIEW', () => {
    const transitions = nextTransitions('ACADEMIC_REVIEW');
    expect(transitions.map((t) => t.status)).toEqual(['APPROVED', 'REVISION_REQUIRED']);
  });

  it('converts a record into a draft with re-numbered display order', () => {
    const record = {
      title: 'Synthetic Set',
      blueprintVersion: { id: '42' },
      academicYear: '2026-2027',
      durationMinutes: 60,
      examinationPeriod: 'Batch 1',
      examType: 'Admission',
      instructions: 'Answer all questions.',
      items: [
        { displayOrder: 5, points: 5, selectionMethod: 'MANUAL', blueprintSectionId: null, question: { id: '101' } },
        { displayOrder: 2, points: 3, selectionMethod: 'MANUAL', blueprintSectionId: '9', question: { id: '102' } },
      ],
    } as unknown as ExamSetRecord;

    const draft = recordToDraft(record);

    expect(draft.blueprintVersionId).toBe('42');
    expect(draft.items).toEqual([
      { questionId: '102', displayOrder: 1, points: 3, blueprintSectionId: '9', selectionMethod: 'MANUAL' },
      { questionId: '101', displayOrder: 2, points: 5, selectionMethod: 'MANUAL' },
    ]);
  });
});
