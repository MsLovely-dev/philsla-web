import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Blueprint } from '../pages/admin/hub/blueprintMockData';
import type { QuestionBankItem } from '../services/backendQuestionBankService';
import type { ExamSetDraft, ExamSetRecord } from '../services/backendExamSetService';
import { authorizationError, conflictError, networkError, serviceSuccess, validationError } from '../services/serviceResult';
import { useExamSets } from './useExamSets';

const blueprint = { id: '17', currentVersionId: '42', name: 'Synthetic Blueprint' } as Blueprint;
const question = { id: '101', questionCode: 'Q-SYNTHETIC' } as QuestionBankItem;
const draft: ExamSetDraft = {
  title: 'Synthetic Set',
  blueprintVersionId: '42',
  academicYear: '2026-2027',
  durationMinutes: 60,
  items: [{ questionId: '101', displayOrder: 1, points: 1 }],
};

function examSet(overrides: Partial<ExamSetRecord> = {}): ExamSetRecord {
  return {
    id: '7',
    examCode: 'EXAM-SYNTHETIC',
    title: 'Synthetic Set',
    examinationPeriod: '',
    examType: 'Admission',
    instructions: '',
    durationMinutes: 60,
    status: 'DRAFT',
    blueprintVersion: { id: '42', specCode: 'BP-SYNTHETIC', name: 'Synthetic Blueprint', versionNumber: '1.0', status: 'APPROVED' },
    academicYear: '2026-2027',
    clonedFromExamSetId: null,
    createdBy: 'Synthetic Owner',
    approvedBy: '',
    publishedBy: '',
    archivedBy: '',
    approvedAt: null,
    publishedAt: null,
    archivedAt: null,
    items: [],
    validationResults: [],
    assemblyRuns: [],
    workflowHistory: [],
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
    ...overrides,
  };
}

function services(initialExamSets: ExamSetRecord[] = [examSet()]) {
  return {
    examSetService: {
      listExamSets: vi.fn().mockResolvedValue(serviceSuccess(initialExamSets)),
      createExamSet: vi.fn().mockResolvedValue(serviceSuccess(examSet())),
      updateExamSet: vi.fn().mockResolvedValue(serviceSuccess(examSet())),
      cloneExamSet: vi.fn().mockResolvedValue(serviceSuccess(examSet({ id: '8' }))),
      transitionExamSet: vi.fn().mockResolvedValue(serviceSuccess(examSet({ status: 'ACADEMIC_REVIEW' }))),
      deleteExamSet: vi.fn().mockResolvedValue(serviceSuccess(null)),
    },
    blueprintService: {
      listBlueprints: vi.fn().mockResolvedValue(serviceSuccess([blueprint])),
    },
    questionBankService: {
      listQuestions: vi.fn().mockResolvedValue(serviceSuccess([question])),
    },
  };
}

describe('useExamSets', () => {
  beforeEach(() => window.localStorage.clear());

  it('loads all prerequisites and applies a successful create without local storage', async () => {
    const injected = services([]);
    const { result } = renderHook(() => useExamSets(injected));

    expect(result.current.loadState).toBe('loading');
    await waitFor(() => expect(result.current.loadState).toBe('empty'));
    expect(result.current.blueprints).toEqual([blueprint]);
    expect(result.current.questions).toEqual([question]);

    await act(async () => {
      await result.current.create(draft);
    });

    expect(result.current.examSets[0].id).toBe('7');
    expect(result.current.loadState).toBe('ready');
    expect(window.localStorage.getItem('philsa_exam_assemblies')).toBeNull();
  });

  it('exposes a retryable load failure and recovers on retry', async () => {
    const injected = services();
    injected.examSetService.listExamSets
      .mockResolvedValueOnce(networkError('Synthetic network failure.'))
      .mockResolvedValueOnce(serviceSuccess([examSet()]));
    const { result } = renderHook(() => useExamSets(injected));

    await waitFor(() => expect(result.current.loadState).toBe('error'));
    expect(result.current.loadError?.message).toBe('Synthetic network failure.');

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.loadState).toBe('ready');
    expect(result.current.examSets).toHaveLength(1);
  });

  it.each([
    ['validation', validationError('Synthetic validation failure.')],
    ['authorization', authorizationError('Synthetic authorization failure.')],
    ['conflict', conflictError('Synthetic conflict failure.')],
  ])('preserves the server record after a %s mutation failure', async (_label, failure) => {
    const injected = services();
    injected.examSetService.updateExamSet.mockResolvedValue(failure);
    const { result } = renderHook(() => useExamSets(injected));
    await waitFor(() => expect(result.current.loadState).toBe('ready'));

    await act(async () => {
      await result.current.update('7', { ...draft, title: 'Changed locally' });
    });

    expect(result.current.examSets).toEqual([examSet()]);
    expect(result.current.mutationError?.message).toContain('Synthetic');
  });
});
