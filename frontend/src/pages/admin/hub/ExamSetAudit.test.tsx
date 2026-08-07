import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ExamSetRecord } from '../../../services/backendExamSetService';
import ExamSetAudit from './ExamSetAudit';

const { mockUseExamSets } = vi.hoisted(() => ({ mockUseExamSets: vi.fn() }));
vi.mock('../../../hooks/useExamSets', () => ({ useExamSets: mockUseExamSets }));

function baseRecord(overrides: Record<string, unknown>): ExamSetRecord {
  return {
    id: '7',
    examCode: 'EXAM-1',
    title: 'Set',
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

describe('ExamSetAudit', () => {
  it('flattens workflow history across exam sets, newest first', () => {
    mockUseExamSets.mockReturnValue(hookState({
      examSets: [
        baseRecord({
          id: '1', title: 'Set One', examCode: 'EXAM-1',
          workflowHistory: [
            { id: 'h1', previousStatus: null, newStatus: 'DRAFT', action: 'Created exam set', remarks: '', initiatedBy: 'Admin', createdAt: '2026-08-01T00:00:00Z' },
          ],
        }),
        baseRecord({
          id: '2', title: 'Set Two', examCode: 'EXAM-2',
          workflowHistory: [
            { id: 'h2', previousStatus: 'DRAFT', newStatus: 'ACADEMIC_REVIEW', action: 'Transitioned to Academic Review', remarks: 'Ready', initiatedBy: 'Admin', createdAt: '2026-08-02T00:00:00Z' },
          ],
        }),
      ],
    }));

    render(<MemoryRouter><ExamSetAudit /></MemoryRouter>);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Set Two');
    expect(rows[2]).toHaveTextContent('Set One');
  });

  it('shows a retryable error state instead of the empty state when the load fails', async () => {
    const reload = vi.fn();
    mockUseExamSets.mockReturnValue(hookState({
      examSets: [],
      loadState: 'error',
      loadError: { kind: 'NETWORK', message: 'Synthetic load failure.' },
      reload,
    }));

    render(<MemoryRouter><ExamSetAudit /></MemoryRouter>);

    expect(screen.getByRole('alert')).toHaveTextContent('Synthetic load failure.');
    expect(screen.queryByText('No audit history yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
