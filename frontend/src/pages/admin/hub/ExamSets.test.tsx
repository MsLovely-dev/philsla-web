import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Blueprint } from './blueprintMockData';
import type { QuestionBankItem } from '../../../services/backendQuestionBankService';
import type { ExamSetRecord } from '../../../services/backendExamSetService';
import { conflictError, serviceSuccess } from '../../../services/serviceResult';
import ExamSets from './ExamSets';

const { mockUseExamSets } = vi.hoisted(() => ({ mockUseExamSets: vi.fn() }));
vi.mock('../../../hooks/useExamSets', () => ({ useExamSets: mockUseExamSets }));

const blueprint = {
  id: '17',
  currentVersionId: '42',
  code: 'BP-SYNTHETIC',
  name: 'Synthetic Blueprint',
  academicYear: '2026-2027',
  examType: 'Admission',
  status: 'APPROVED',
} as Blueprint;
const question = {
  id: '101',
  questionCode: 'Q-SYNTHETIC',
  questionText: 'Synthetic assessment prompt.',
  questionTypeCode: 'MCQ',
  subject: 'Synthetic Subject',
  difficulty: 'EASY',
  points: 1,
  status: 'APPROVED',
} as QuestionBankItem;
const record = {
  id: '7',
  examCode: 'EXAM-SYNTHETIC',
  title: 'Server-provided Exam Set',
  examinationPeriod: 'Synthetic period',
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
} as ExamSetRecord;

function hookState(overrides: Record<string, unknown> = {}) {
  return {
    examSets: [record],
    blueprints: [blueprint],
    questions: [question],
    loadState: 'ready',
    loadError: null,
    mutationState: 'idle',
    mutationError: null,
    reload: vi.fn(),
    create: vi.fn().mockResolvedValue(serviceSuccess(record)),
    update: vi.fn().mockResolvedValue(serviceSuccess(record)),
    clone: vi.fn().mockResolvedValue(serviceSuccess(record)),
    transition: vi.fn().mockResolvedValue(serviceSuccess(record)),
    autoAssemble: vi.fn().mockResolvedValue(serviceSuccess(record)),
    remove: vi.fn().mockResolvedValue(serviceSuccess(null)),
    ...overrides,
  };
}

function renderPage() {
  return render(<MemoryRouter><ExamSets /></MemoryRouter>);
}

describe('ExamSets', () => {
  beforeEach(() => mockUseExamSets.mockReset());

  it('renders accessible loading, retryable error, and empty states', async () => {
    mockUseExamSets.mockReturnValueOnce(hookState({ loadState: 'loading', examSets: [] }));
    const loading = renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading exam sets');
    loading.unmount();

    const reload = vi.fn();
    mockUseExamSets.mockReturnValueOnce(hookState({
      loadState: 'error',
      examSets: [],
      loadError: { kind: 'NETWORK', message: 'Synthetic load failure.' },
      reload,
    }));
    const error = renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Synthetic load failure.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reload).toHaveBeenCalledOnce();
    error.unmount();

    mockUseExamSets.mockReturnValueOnce(hookState({ loadState: 'empty', examSets: [] }));
    renderPage();
    expect(screen.getByText('No exam sets yet')).toBeInTheDocument();
  });

  it('renders a server-provided Exam Set', () => {
    mockUseExamSets.mockReturnValue(hookState());
    renderPage();
    expect(screen.getByText('Server-provided Exam Set')).toBeInTheDocument();
    expect(screen.getByText('EXAM-SYNTHETIC')).toBeInTheDocument();
  });

  it('creates with the real Blueprint Version and Question Bank ids', async () => {
    const create = vi.fn().mockResolvedValue(serviceSuccess(record));
    mockUseExamSets.mockReturnValue(hookState({ loadState: 'empty', examSets: [], create }));
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('button', { name: 'Create Exam Set' })[0]);
    await user.type(screen.getByLabelText('Title'), 'Synthetic Set');
    await user.click(screen.getByRole('checkbox', { name: /Q-SYNTHETIC/ }));
    await user.click(screen.getByRole('button', { name: 'Save Exam Set' }));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Synthetic Set',
      blueprintVersionId: '42',
      items: [{ questionId: '101', displayOrder: 1, points: 1 }],
    }));
  });

  it('shows a conflict and keeps the original server row visible', async () => {
    const create = vi.fn().mockResolvedValue(conflictError('Synthetic conflict.'));
    mockUseExamSets.mockReturnValue(hookState({ create }));
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Create Exam Set' }));
    await user.type(screen.getByLabelText('Title'), 'Conflicting Set');
    await user.click(screen.getByRole('button', { name: 'Save Exam Set' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Synthetic conflict.');
    expect(screen.getByText('Server-provided Exam Set')).toBeInTheDocument();
  });

  it('preserves surviving item metadata when removing an item from the assembly workspace', async () => {
    const update = vi.fn().mockResolvedValue(serviceSuccess(record));
    const recordWithMetadata = {
      ...record,
      items: [{
        id: '70',
        displayOrder: 1,
        points: 3,
        selectionMethod: 'automatic',
        selectedBy: 'Synthetic Owner',
        selectedAt: '2026-08-05T00:00:00Z',
        blueprintSectionId: '55',
        question: {
          id: '101',
          questionCode: 'Q-SYNTHETIC',
          questionType: 'Multiple Choice',
          questionTypeCode: 'MCQ',
          subject: 'Synthetic Subject',
          topic: 'Synthetic Topic',
          difficulty: 'EASY',
          status: 'APPROVED',
          points: 1,
        },
      }, {
        id: '71',
        displayOrder: 2,
        points: 2,
        selectionMethod: 'manual',
        selectedBy: 'Synthetic Owner',
        selectedAt: '2026-08-05T00:00:00Z',
        blueprintSectionId: '56',
        question: {
          id: '102',
          questionCode: 'Q-SYNTHETIC-2',
          questionType: 'Multiple Choice',
          questionTypeCode: 'MCQ',
          subject: 'Synthetic Subject',
          topic: 'Synthetic Topic',
          difficulty: 'EASY',
          status: 'APPROVED',
          points: 1,
        },
      }],
    } as ExamSetRecord;
    mockUseExamSets.mockReturnValue(hookState({ examSets: [recordWithMetadata], update }));
    renderPage();
    const user = userEvent.setup();

    // Editing an existing Exam Set now opens the assembly workspace instead of the modal.
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: /remove q-synthetic-2/i }));

    expect(update).toHaveBeenCalledWith('7', expect.objectContaining({
      items: [{
        questionId: '101',
        displayOrder: 1,
        points: 3,
        blueprintSectionId: '55',
        selectionMethod: 'automatic',
      }],
    }));
  });

  it('wires clone, lifecycle transition, and confirmed deletion to the API hook', async () => {
    const clone = vi.fn().mockResolvedValue(serviceSuccess(record));
    const transition = vi.fn().mockResolvedValue(serviceSuccess(record));
    const remove = vi.fn().mockResolvedValue(serviceSuccess(null));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUseExamSets.mockReturnValue(hookState({ clone, transition, remove }));
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Clone' }));
    expect(clone).toHaveBeenCalledWith('7');

    await user.click(screen.getByRole('button', { name: 'Submit for Review' }));
    expect(transition).toHaveBeenCalledWith('7', {
      status: 'ACADEMIC_REVIEW',
      remarks: 'Submitted for academic review.',
    });

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(confirm).toHaveBeenCalledWith('Delete Server-provided Exam Set? This action cannot be undone.');
    expect(remove).toHaveBeenCalledWith('7');
    confirm.mockRestore();
  });

  it('opens the assembly workspace when Edit is clicked, instead of the edit modal', async () => {
    mockUseExamSets.mockReturnValue(hookState());
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('button', { name: /back to exam sets/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /edit exam set/i })).not.toBeInTheDocument();
  });

  it('runs auto-assembly from inside the assembly workspace', async () => {
    const autoAssemble = vi.fn().mockResolvedValue(serviceSuccess(record));
    mockUseExamSets.mockReturnValue(hookState({ autoAssemble }));
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: /back to exam sets/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run auto-selection/i }));

    expect(autoAssemble).toHaveBeenCalledWith('7');
  });

  it('shows metric tiles computed from the loaded exam sets', () => {
    mockUseExamSets.mockReturnValue(hookState({
      examSets: [
        { ...record, id: '1', status: 'DRAFT' },
        { ...record, id: '2', status: 'PUBLISHED' },
      ],
    }));
    renderPage();

    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('normalizes lowercase validationResults.result values when counting the Validation Issues tile', () => {
    const validationResult = (result: string) => ([{
      id: `v-${result}`,
      validationCode: 'SYNTHETIC_CHECK',
      validationName: 'Synthetic check',
      result,
      expectedValue: '',
      actualValue: '',
      message: '',
      validatedAt: '2026-08-05T00:00:00Z',
    }]);
    mockUseExamSets.mockReturnValue(hookState({
      examSets: [
        { ...record, id: '1', validationResults: validationResult('passed') },
        { ...record, id: '2', validationResults: validationResult('failed') },
      ],
    }));
    renderPage();

    // Real backend data serializes ValidationResult as lowercase. If the tile compared
    // against the uppercase literal 'PASSED' without normalizing case, the lowercase
    // 'passed' row would also be miscounted as an issue, reporting 2 instead of 1.
    expect(screen.getByText('Validation Issues').parentElement).toHaveTextContent('1');
  });
});
