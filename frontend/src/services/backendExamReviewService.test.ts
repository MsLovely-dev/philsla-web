import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendExamReviewService } from './backendExamReviewService';

describe('BackendExamReviewService', () => {
  const payload = [{
    id: 'review-id',
    attemptCode: 'DEMO-ATTEMPT-001',
    candidateId: 'PS-DEMO-0001',
    candidateName: 'Demo Candidate 001',
    examSetCode: 'DEMO-SET-2026',
    submittedAt: '2026-08-01T09:15:00+08:00',
    status: 'SUBMITTED' as const,
    totalScore: 68,
    systemInitialScore: 68,
    maxScore: 100,
    pendingSubjectiveItems: 2,
    reviewedBy: '',
    reviewedAt: null,
    answerSheet: null,
  }];

  it('loads the persisted Exam Review queue from the backend', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const service = new BackendExamReviewService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.list();

    expect(result).toEqual({ ok: true, data: payload });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/exam-reviews/',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('loads one persisted Exam Review summary by id', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const service = new BackendExamReviewService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.get('review-id');

    expect(result).toEqual({ ok: true, data: payload[0] });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/exam-reviews/review-id/',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('releases a graded Exam Review record to Score Management', async () => {
    const released = {
      ...payload[0],
      status: 'FINALIZED' as const,
      reviewedBy: 'LOCAL_PROTOTYPE',
      reviewedAt: '2026-08-03T16:00:00+08:00',
    };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(released), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const service = new BackendExamReviewService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.release('review-id');

    expect(result).toEqual({ ok: true, data: released });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/exam-reviews/review-id/release/',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('updates an unreleased Exam Review grading status', async () => {
    const graded = {
      ...payload[0],
      status: 'GRADED' as const,
      reviewedBy: 'LOCAL_PROTOTYPE',
      reviewedAt: '2026-08-03T16:05:00+08:00',
    };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(graded), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const service = new BackendExamReviewService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.setGradingStatus('review-id', 'GRADED');

    expect(result).toEqual({ ok: true, data: graded });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/exam-reviews/review-id/grading-status/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ status: 'GRADED' }) }),
    );
  });

  it('uploads a student answer sheet as multipart form data', async () => {
    const uploaded = {
      ...payload[0],
      answerSheet: {
        id: 'answer-sheet-id',
        contentType: 'application/pdf' as const,
        size: 24,
        templateSource: 'STANDARD_CSV' as const,
        uploadedBy: 'LOCAL_PROTOTYPE',
        uploadedAt: '2026-08-03T16:10:00+08:00',
      },
    };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(uploaded), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const service = new BackendExamReviewService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));
    const file = new File(['%PDF-1.4 synthetic'], 'answer-sheet.pdf', { type: 'application/pdf' });

    const result = await service.uploadAnswerSheet('review-id', file);

    expect(result).toEqual({ ok: true, data: uploaded });
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(fetcher.mock.calls[0]?.[0]).toBe('http://backend.test/api/v1/results/exam-reviews/review-id/answer-sheets/');
    expect(request.method).toBe('POST');
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.body as FormData).get('file')).toBe(file);
    expect((request.body as FormData).get('templateSource')).toBe('STANDARD_CSV');
    expect(new Headers(request.headers).has('Content-Type')).toBe(false);
  });

  it('saves an official score for a subjective review item', async () => {
    const scored = { ...payload[0], totalScore: 76, pendingSubjectiveItems: 1, examItems: [] };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(scored), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const service = new BackendExamReviewService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.scoreItem('review-id', 'item-id', 8);

    expect(result).toEqual({ ok: true, data: scored });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/exam-reviews/review-id/items/item-id/score/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ points: 8 }) }),
    );
  });
});
