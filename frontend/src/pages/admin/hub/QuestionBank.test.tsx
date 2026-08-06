import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestionBankItem } from '../../../services/backendQuestionBankService';
import QuestionBank from './QuestionBank';

const { listQuestions, createQuestion, updateQuestion, transitionQuestion, deleteQuestion } = vi.hoisted(() => ({
  listQuestions: vi.fn(),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  transitionQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}));

type MockUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SYSTEM_ADMIN' | 'ITEM_WRITER';
};

const systemAdminUser: MockUser = {
  id: 'system-admin-user',
  email: 'system.admin@example.test',
  firstName: 'System',
  lastName: 'Admin',
  role: 'SYSTEM_ADMIN',
};

let currentUser: MockUser | null = systemAdminUser;

vi.mock('../../../services/backendQuestionBankService', () => ({
  questionBankService: { listQuestions, createQuestion, updateQuestion, transitionQuestion, deleteQuestion },
}));

vi.mock('../../../PhilSAContext', () => ({
  usePhilSA: () => ({ user: currentUser }),
}));

vi.mock('./StimulusManagement', () => ({ default: () => null }));
vi.mock('./BulkUpload', () => ({ default: () => null }));

const backendQuestion: QuestionBankItem = {
  id: 'backend-question-1',
  questionCode: 'QB-BACKEND-001',
  questionType: 'Multiple Choice',
  questionTypeCode: 'MCQ',
  subject: 'Backend Subject',
  subjectCode: 'BACKEND',
  topic: 'Service Wiring',
  topicCode: 'SERVICE_WIRING',
  competency: 'Use service boundaries',
  competencyCode: 'SERVICE_BOUNDARY',
  difficulty: 'EASY',
  questionText: 'Which source should the page prefer?',
  explanation: '',
  points: 1,
  status: 'PENDING_REVIEW',
  createdBy: 'Synthetic Author',
  createdByUserId: 'creator-user',
  reviewedBy: '',
  approvedBy: '',
  reviewedAt: null,
  approvedAt: null,
  retiredAt: null,
  archivedAt: null,
  choices: [],
  answers: [],
  rubrics: [],
  tags: [],
  attachments: [],
  workflowHistory: [],
  createdAt: '2026-08-05T00:00:00Z',
  updatedAt: '2026-08-05T00:00:00Z',
};

describe('QuestionBank page bootstrap', () => {
  beforeEach(() => {
    listQuestions.mockReset();
    createQuestion.mockReset();
    updateQuestion.mockReset();
    transitionQuestion.mockReset();
    deleteQuestion.mockReset();
    localStorage.clear();
    currentUser = systemAdminUser;
  });

  it('renders backend questions instead of synthetic fallback questions when the service returns data', async () => {
    listQuestions.mockResolvedValue({ ok: true, data: [backendQuestion] });

    render(<QuestionBank />);

    expect(await screen.findByText('Backend Subject')).toBeInTheDocument();
    expect(screen.queryByText('Q-DEMO-001')).not.toBeInTheDocument();
  });

  it('shows loading state while the question service is pending', async () => {
    listQuestions.mockReturnValue(new Promise(() => undefined));

    render(<QuestionBank />);

    expect(screen.getByText('Loading question bank...')).toBeInTheDocument();
  });

  it('renders synthetic fallback questions when the service returns no usable data', async () => {
    listQuestions.mockResolvedValue({ ok: true, data: [] });

    render(<QuestionBank />);

    expect(await screen.findByText('Q-DEMO-001')).toBeInTheDocument();
    await waitFor(() => expect(listQuestions).toHaveBeenCalledTimes(1));
  });

  it('renders synthetic fallback questions when the service fails', async () => {
    listQuestions.mockRejectedValue(new Error('offline'));

    render(<QuestionBank />);

    expect(await screen.findByText('Q-DEMO-001')).toBeInTheDocument();
  });

  it('creates a question through the service boundary', async () => {
    const user = userEvent.setup();
    const createdQuestion = { ...backendQuestion, id: 'created-question-1', subject: 'Created Subject', questionText: 'Created prompt' };
    listQuestions.mockResolvedValue({ ok: true, data: [] });
    createQuestion.mockResolvedValue({ ok: true, data: createdQuestion });

    render(<QuestionBank />);

    await user.click(await screen.findByRole('button', { name: /add new item/i }));
    await user.type(screen.getByPlaceholderText('Type the question prompt...'), 'Created prompt');
    await user.click(screen.getByRole('button', { name: /save question/i }));

    await waitFor(() => expect(createQuestion).toHaveBeenCalledTimes(1));
    expect(createQuestion).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_REVIEW' }));
    expect(screen.getByText('Created Subject')).toBeInTheDocument();
  });

  it('updates a question through the service boundary', async () => {
    const user = userEvent.setup();
    const updatedQuestion = { ...backendQuestion, subject: 'Updated Subject', questionText: 'Updated prompt' };
    listQuestions.mockResolvedValue({ ok: true, data: [backendQuestion] });
    updateQuestion.mockResolvedValue({ ok: true, data: updatedQuestion });

    render(<QuestionBank />);

    const row = (await screen.findByText('Backend Subject')).closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByTitle('Edit Question'));
    const prompt = screen.getByPlaceholderText('Type the question prompt...');
    await user.clear(prompt);
    await user.type(prompt, 'Updated prompt');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateQuestion).toHaveBeenCalledTimes(1));
    expect(updateQuestion).toHaveBeenCalledWith('backend-question-1', expect.objectContaining({ status: 'PENDING_REVIEW' }));
    expect(screen.getByText('Updated Subject')).toBeInTheDocument();
  });

  it('transitions a question through the service boundary', async () => {
    const user = userEvent.setup();
    const transitionedQuestion = { ...backendQuestion, status: 'APPROVED' as const };
    listQuestions.mockResolvedValue({ ok: true, data: [backendQuestion] });
    transitionQuestion.mockResolvedValue({ ok: true, data: transitionedQuestion });

    render(<QuestionBank />);

    const row = (await screen.findByText('Backend Subject')).closest('tr');
    expect(row).not.toBeNull();
    await user.selectOptions(screen.getByDisplayValue('Pending Review'), 'ALL');
    await user.selectOptions(within(row as HTMLElement).getByRole('combobox', { name: /review question/i }), 'APPROVED');
    await user.click(screen.getByRole('button', { name: /apply changes/i }));

    await waitFor(() => expect(transitionQuestion).toHaveBeenCalledWith('backend-question-1', { status: 'APPROVED', remarks: '' }));
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
  });

  it('sends correction requests with the correction workflow status', async () => {
    const user = userEvent.setup();
    const approvedQuestion = { ...backendQuestion, status: 'APPROVED' as const };
    listQuestions.mockResolvedValue({ ok: true, data: [approvedQuestion] });
    transitionQuestion.mockResolvedValue({ ok: true, data: { ...approvedQuestion, status: 'PENDING_REVIEW' } });

    render(<QuestionBank />);

    await user.selectOptions(screen.getByDisplayValue('Pending Review'), 'ALL');
    const row = (await screen.findByText('Backend Subject')).closest('tr');
    expect(row).not.toBeNull();
    await user.selectOptions(within(row as HTMLElement).getByRole('combobox', { name: /review question/i }), 'FOR CORRECTION');
    await user.type(screen.getByPlaceholderText(/please specify what needs to be revised/i), 'Please revise the answer key.');
    await user.click(screen.getByRole('button', { name: /apply changes/i }));

    await waitFor(() => expect(transitionQuestion).toHaveBeenCalledWith('backend-question-1', {
      status: 'FOR_CORRECTION',
      remarks: 'Please revise the answer key.',
    }));
  });

  it('hides review actions for self-authored questions', async () => {
    currentUser = { ...systemAdminUser, id: 'creator-user' };
    listQuestions.mockResolvedValue({ ok: true, data: [backendQuestion] });

    render(<QuestionBank />);

    const row = (await screen.findByText('Backend Subject')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).queryByRole('combobox', { name: /review question/i })).not.toBeInTheDocument();
  });

  it('hides review actions for non-system-admin users', async () => {
    currentUser = { ...systemAdminUser, id: 'writer-user', role: 'ITEM_WRITER' };
    listQuestions.mockResolvedValue({ ok: true, data: [backendQuestion] });

    render(<QuestionBank />);

    const row = (await screen.findByText('Backend Subject')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).queryByRole('combobox', { name: /review question/i })).not.toBeInTheDocument();
  });

  it('deletes a question through the service boundary', async () => {
    const user = userEvent.setup();
    listQuestions.mockResolvedValue({ ok: true, data: [backendQuestion] });
    deleteQuestion.mockResolvedValue({ ok: true, data: null });
    vi.stubGlobal('confirm', vi.fn(() => true));

    render(<QuestionBank />);

    const row = (await screen.findByText('Backend Subject')).closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByTitle('Delete Question'));

    await waitFor(() => expect(deleteQuestion).toHaveBeenCalledWith('backend-question-1'));
    await waitFor(() => expect(screen.queryByText('Backend Subject')).not.toBeInTheDocument());
  });
});
