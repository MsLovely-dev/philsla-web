import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backendExamReviewService, type ExamReviewDetailItem } from '../../../services/backendExamReviewService';
import { conflictError } from '../../../services/serviceResult';
import ExamReviewDetail from './ExamReviewDetail';

vi.mock('../../../services/backendExamReviewService', () => ({
  backendExamReviewService: {
    get: vi.fn(),
    release: vi.fn(),
    scoreItem: vi.fn(),
    uploadAnswerSheet: vi.fn(),
  },
}));

const review: ExamReviewDetailItem = {
  id: 'review-id',
  attemptCode: 'DEMO-ATTEMPT-001',
  candidateId: 'PS-DEMO-0001',
  candidateName: 'Demo Candidate 001',
  examSetCode: 'DEMO-SET-2026',
  submittedAt: '2026-08-01T09:15:00+08:00',
  status: 'SUBMITTED',
  totalScore: 4,
  systemInitialScore: 4,
  maxScore: 8,
  pendingSubjectiveItems: 1,
  reviewedBy: '',
  reviewedAt: null,
  answerSheet: null,
  examItems: [
    {
      id: 'math-item',
      subject: 'MATH',
      itemNumber: 1,
      itemType: 'OBJECTIVE',
      question: 'What is 18 + 24?',
      answerOptions: ['40', '41', '42', '43'],
      studentAnswer: '42',
      expectedAnswer: '42',
      responseSeconds: 45,
      rubric: '',
      aiProposedScore: null,
      wordCount: null,
      responseSubmittedAt: '2026-08-01T09:15:00+08:00',
      pointsAwarded: 4,
      maxPoints: 4,
      reviewStatus: 'CORRECT',
    },
    {
      id: 'english-item',
      subject: 'ENGLISH',
      itemNumber: 1,
      itemType: 'SUBJECTIVE',
      question: 'Explain how context clues help a reader.',
      answerOptions: [],
      studentAnswer: 'Nearby words provide hints.',
      expectedAnswer: 'The response uses surrounding details to infer meaning.',
      responseSeconds: 120,
      rubric: 'Evidence (4pts), inference (4pts), clarity (2pts)',
      aiProposedScore: 8,
      wordCount: 5,
      responseSubmittedAt: '2026-08-01T09:15:00+08:00',
      pointsAwarded: null,
      maxPoints: 10,
      reviewStatus: 'PENDING_REVIEW',
    },
  ],
};

function renderExamReviewDetail() {
  render(
    <MemoryRouter initialEntries={['/admin/hub/review/review-id']}>
      <Routes>
        <Route path="/admin/hub/review/:id" element={<ExamReviewDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ExamReviewDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(backendExamReviewService.get).mockResolvedValue({ ok: true, data: review });
  });

  it('shows persisted questions, responses, answer keys, and pending items by subject', async () => {
    const user = userEvent.setup();
    renderExamReviewDetail();

    expect(await screen.findByText('What is 18 + 24?')).toBeInTheDocument();
    expect(screen.getByText('Final Answer Sheet Mappings')).toBeInTheDocument();
    expect(screen.getByText('Scanned paper OMR mappings & active digital answers across subjects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Student Answer Sheet' })).toBeInTheDocument();
    expect(screen.getByText('Objective Response')).toBeInTheDocument();
    expect(screen.getByText('Correct answer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /English/ }));

    expect(screen.getByText('Explain how context clues help a reader.')).toBeInTheDocument();
    expect(screen.getByText('Pending Check')).toBeInTheDocument();
    expect(screen.getByText('Official Rubric')).toBeInTheDocument();
    expect(screen.getByText('AI System Proposed Score')).toBeInTheDocument();
  });

  it('saves an official subjective score through the backend', async () => {
    const user = userEvent.setup();
    const scoredReview: ExamReviewDetailItem = {
      ...review,
      totalScore: 12,
      pendingSubjectiveItems: 0,
      examItems: review.examItems.map(item => item.id === 'english-item'
        ? { ...item, pointsAwarded: 8, reviewStatus: 'GRADED' }
        : item),
    };
    vi.mocked(backendExamReviewService.scoreItem).mockResolvedValue({ ok: true, data: scoredReview });
    renderExamReviewDetail();

    await user.click(await screen.findByRole('button', { name: /English/ }));
    const scoreInput = screen.getByRole('spinbutton', { name: 'Official score for question 1' });
    await user.clear(scoreInput);
    await user.type(scoreInput, '8');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(backendExamReviewService.scoreItem).toHaveBeenCalledWith('review-id', 'english-item', 8);
    expect(await screen.findByText('Graded')).toBeInTheDocument();
    expect(screen.getByText('Points: 8 / 10')).toBeInTheDocument();
  });

  it('releases a completed graded review through the backend', async () => {
    const user = userEvent.setup();
    const completedReview: ExamReviewDetailItem = {
      ...review,
      status: 'GRADED',
      pendingSubjectiveItems: 0,
    };
    vi.mocked(backendExamReviewService.get).mockResolvedValue({ ok: true, data: completedReview });
    vi.mocked(backendExamReviewService.release).mockResolvedValue({
      ok: true,
      data: { ...completedReview, status: 'FINALIZED' },
    });
    renderExamReviewDetail();

    await user.click(await screen.findByRole('button', { name: 'Release to Score Management' }));

    expect(backendExamReviewService.release).toHaveBeenCalledWith('review-id');
    expect(await screen.findByText('Released to Score Management')).toBeInTheDocument();
  });

  it('keeps release available and shows the backend handoff conflict', async () => {
    const user = userEvent.setup();
    const completedReview: ExamReviewDetailItem = {
      ...review,
      status: 'GRADED',
      pendingSubjectiveItems: 0,
    };
    vi.mocked(backendExamReviewService.get).mockResolvedValue({ ok: true, data: completedReview });
    vi.mocked(backendExamReviewService.release).mockResolvedValue(
      conflictError('Exam Review must match exactly one Score Management Exam Set.'),
    );
    renderExamReviewDetail();

    await user.click(await screen.findByRole('button', { name: 'Release to Score Management' }));

    expect(await screen.findByText('Exam Review must match exactly one Score Management Exam Set.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Release to Score Management' })).toBeInTheDocument();
    expect(screen.queryByText('Released to Score Management')).not.toBeInTheDocument();
  });

  it('blocks release in the UI when a graded review still has pending subjective items', async () => {
    vi.mocked(backendExamReviewService.get).mockResolvedValue({
      ok: true,
      data: { ...review, status: 'GRADED', pendingSubjectiveItems: 1 },
    });
    renderExamReviewDetail();

    expect(await screen.findByText('1 subjective item still requires an official score before release.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Release to Score Management' })).not.toBeInTheDocument();
    expect(backendExamReviewService.release).not.toHaveBeenCalled();
  });

  it('shows a fallback when a subjective item has no rubric text', async () => {
    const user = userEvent.setup();
    vi.mocked(backendExamReviewService.get).mockResolvedValue({
      ok: true,
      data: {
        ...review,
        examItems: review.examItems.map(item => (
          item.id === 'english-item' ? { ...item, rubric: '' } : item
        )),
      },
    });
    renderExamReviewDetail();

    await user.click(await screen.findByRole('button', { name: /English/ }));

    expect(screen.getByText('No rubric provided for this item.')).toBeInTheDocument();
  });
});
