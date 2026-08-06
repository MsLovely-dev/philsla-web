import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backendExamReviewService, type ExamReviewQueueItem } from '../../../services/backendExamReviewService';
import ExamReviewList from './ExamReviewList';

vi.mock('../../../services/backendExamReviewService', () => ({
  backendExamReviewService: {
    list: vi.fn(),
    setGradingStatus: vi.fn(),
    uploadAnswerSheet: vi.fn(),
  },
}));

const pendingAttempt: ExamReviewQueueItem = {
  id: 'pending-review',
  attemptCode: 'DEMO-ATTEMPT-004',
  candidateId: 'PS-DEMO-0004',
  candidateName: 'Demo Candidate 004',
  examSetCode: 'DEMO-SET-2026',
  submittedAt: '2026-08-02T14:20:00+08:00',
  status: 'SUBMITTED',
  totalScore: 72,
  systemInitialScore: 72,
  maxScore: 100,
  pendingSubjectiveItems: 3,
  reviewedBy: '',
  reviewedAt: null,
  answerSheet: null,
};

const gradedAttempt: ExamReviewQueueItem = {
  ...pendingAttempt,
  id: 'graded-review',
  attemptCode: 'DEMO-ATTEMPT-002',
  candidateId: 'PS-DEMO-0002',
  candidateName: 'Demo Candidate 002',
  status: 'GRADED',
  pendingSubjectiveItems: 0,
  reviewedBy: 'LOCAL_PROTOTYPE',
  reviewedAt: '2026-08-02T15:00:00+08:00',
};

const listMock = vi.mocked(backendExamReviewService.list);
const setGradingStatusMock = vi.mocked(backendExamReviewService.setGradingStatus);
const uploadAnswerSheetMock = vi.mocked(backendExamReviewService.uploadAnswerSheet);

function renderList() {
  render(
    <MemoryRouter>
      <ExamReviewList />
    </MemoryRouter>,
  );
}

describe('ExamReviewList grading confirmations', () => {
  beforeEach(() => {
    listMock.mockResolvedValue({ ok: true, data: [pendingAttempt, gradedAttempt] });
    setGradingStatusMock.mockReset();
    uploadAnswerSheetMock.mockReset();
  });

  it('requires confirmation before checking an exam', async () => {
    const user = userEvent.setup();
    const completedAttempt = { ...pendingAttempt, pendingSubjectiveItems: 0 };
    listMock.mockResolvedValue({ ok: true, data: [completedAttempt, gradedAttempt] });
    setGradingStatusMock.mockResolvedValue({ ok: true, data: { ...completedAttempt, status: 'GRADED' } });
    renderList();

    const checkButton = await screen.findByRole('button', { name: 'Mark Demo Candidate 004 as Graded' });
    await user.click(checkButton);

    expect(setGradingStatusMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Confirm exam check?');
    await user.click(screen.getByRole('button', { name: 'Confirm Check' }));

    await waitFor(() => expect(setGradingStatusMock).toHaveBeenCalledWith('pending-review', 'GRADED'));
  });

  it('prevents grading while subjective items are pending', async () => {
    renderList();

    const gradeButton = await screen.findByRole('button', { name: 'Mark Demo Candidate 004 as Graded' });

    expect(gradeButton).toBeDisabled();
    expect(gradeButton).toHaveAttribute(
      'title',
      'Score 3 pending subjective items before marking this exam as Graded',
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(setGradingStatusMock).not.toHaveBeenCalled();
  });

  it('requires confirmation before rejecting grading and returning an exam to pending', async () => {
    const user = userEvent.setup();
    setGradingStatusMock.mockResolvedValue({ ok: true, data: { ...gradedAttempt, status: 'SUBMITTED', reviewedBy: '', reviewedAt: null } });
    renderList();

    const rejectButton = await screen.findByRole('button', { name: 'Reject grading for Demo Candidate 002 and return to Pending' });
    await user.click(rejectButton);

    expect(setGradingStatusMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('return the exam to Pending');
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(setGradingStatusMock).toHaveBeenCalledWith('graded-review', 'SUBMITTED'));
  });

  it('uploads an answer sheet for a selected exam from the table toolbar', async () => {
    const user = userEvent.setup();
    uploadAnswerSheetMock.mockResolvedValue({
      ok: true,
      data: {
        ...pendingAttempt,
        examItems: [],
        answerSheet: {
          id: 'sheet-id',
          contentType: 'application/pdf',
          size: 20,
          templateSource: 'HANDWRITTEN_OCR',
          uploadedBy: 'LOCAL_PROTOTYPE',
          uploadedAt: '2026-08-04T10:15:00+08:00',
        },
      },
    });
    renderList();

    await user.click(await screen.findByRole('button', { name: 'Upload Student Answer Sheet' }));
    expect(screen.getByRole('dialog', { name: 'Upload Student Answer Sheet' })).toBeInTheDocument();
    expect(screen.getByText('Select Template Source & Paper Layout')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Standard CSV/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Handwritten OCR/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /OMR Template Paper/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Student answer sheet file')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Handwritten OCR/ }));
    expect(screen.getByText('Choose file')).toBeInTheDocument();
    const file = new File(['%PDF-1.4 synthetic'], 'student-sheet.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Student answer sheet file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload Answer Sheet' }));

    await waitFor(() => expect(uploadAnswerSheetMock).toHaveBeenCalledWith('pending-review', file, 'HANDWRITTEN_OCR'));
    expect(await screen.findByRole('status')).toHaveTextContent('student-sheet.pdf was uploaded for Demo Candidate 004.');
  });
});
