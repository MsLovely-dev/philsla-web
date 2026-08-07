import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ExamSetRecord } from '../../../services/backendExamSetService';
import ExamSetPublished from './ExamSetPublished';

const { mockUseExamSets } = vi.hoisted(() => ({ mockUseExamSets: vi.fn() }));
vi.mock('../../../hooks/useExamSets', () => ({ useExamSets: mockUseExamSets }));

function baseRecord(overrides: Record<string, unknown>): ExamSetRecord {
  return {
    id: '7',
    examCode: 'EXAM-1',
    title: 'Approved Set',
    examinationPeriod: '',
    examType: 'Admission',
    instructions: '',
    durationMinutes: 60,
    status: 'DRAFT',
    blueprintVersion: { id: '42', specCode: 'BP-1', name: 'Blueprint', versionNumber: '1.0', status: 'APPROVED' },
    academicYear: '2026-2027',
    clonedFromExamSetId: null,
    createdBy: '',
    approvedBy: '',
    publishedBy: '',
    archivedBy: '',
    approvedAt: null,
    publishedAt: null,
    archivedAt: null,
    publishedHash: null,
    items: [],
    validationResults: [],
    assemblyRuns: [],
    workflowHistory: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as ExamSetRecord;
}

function hookState(overrides: Record<string, unknown> = {}) {
  return {
    examSets: [],
    blueprints: [],
    questions: [],
    loadState: 'ready',
    loadError: null,
    mutationState: 'idle',
    mutationError: null,
    reload: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    clone: vi.fn(),
    transition: vi.fn(),
    autoAssemble: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

describe('ExamSetPublished', () => {
  it('shows only APPROVED and PUBLISHED exam sets, with the hash for published ones', () => {
    mockUseExamSets.mockReturnValue(hookState({
      examSets: [
        baseRecord({ id: '1', title: 'Draft Set', status: 'DRAFT' }),
        baseRecord({ id: '2', title: 'Approved Set', status: 'APPROVED' }),
        baseRecord({ id: '3', title: 'Published Set', status: 'PUBLISHED', publishedHash: 'a'.repeat(64) }),
      ],
    }));

    render(<MemoryRouter><ExamSetPublished /></MemoryRouter>);

    expect(screen.queryByText('Draft Set')).not.toBeInTheDocument();
    expect(screen.getByText('Approved Set')).toBeInTheDocument();
    expect(screen.getByText('Published Set')).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64), { exact: false })).toBeInTheDocument();
  });
});
