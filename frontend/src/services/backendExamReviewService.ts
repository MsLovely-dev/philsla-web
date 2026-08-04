import { sharedApiClient, type ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export type ExamReviewQueueStatus = 'SUBMITTED' | 'GRADED' | 'FINALIZED';

export interface ExamReviewAnswerSheet {
  id: string;
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png';
  size: number;
  templateSource: ExamReviewTemplateSource;
  uploadedBy: string;
  uploadedAt: string;
}

export type ExamReviewTemplateSource = 'STANDARD_CSV' | 'HANDWRITTEN_OCR' | 'OMR_TEMPLATE_PAPER';

export interface ExamReviewQueueItem {
  id: string;
  attemptCode: string;
  candidateId: string;
  candidateName: string;
  examSetCode: string;
  submittedAt: string;
  status: ExamReviewQueueStatus;
  totalScore: number;
  systemInitialScore: number;
  maxScore: number;
  pendingSubjectiveItems: number;
  reviewedBy: string;
  reviewedAt: string | null;
  answerSheet: ExamReviewAnswerSheet | null;
}

export type ExamReviewSubject = 'MATH' | 'ENGLISH' | 'FILIPINO' | 'SCIENCE';

export interface ExamReviewItem {
  id: string;
  subject: ExamReviewSubject;
  itemNumber: number;
  itemType: 'OBJECTIVE' | 'SUBJECTIVE';
  question: string;
  answerOptions: string[];
  studentAnswer: string;
  expectedAnswer: string;
  responseSeconds: number;
  rubric: string;
  aiProposedScore: number | null;
  wordCount: number | null;
  responseSubmittedAt: string | null;
  pointsAwarded: number | null;
  maxPoints: number;
  reviewStatus: 'PENDING_REVIEW' | 'CORRECT' | 'INCORRECT' | 'PARTIAL' | 'GRADED';
}

export interface ExamReviewDetailItem extends ExamReviewQueueItem {
  examItems: ExamReviewItem[];
}

export class BackendExamReviewService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  list(): Promise<ServiceResult<ExamReviewQueueItem[]>> {
    return this.apiClient.request<ExamReviewQueueItem[]>('/api/v1/results/exam-reviews/');
  }

  get(reviewId: string): Promise<ServiceResult<ExamReviewDetailItem>> {
    return this.apiClient.request<ExamReviewDetailItem>(`/api/v1/results/exam-reviews/${encodeURIComponent(reviewId)}/`);
  }

  release(reviewId: string): Promise<ServiceResult<ExamReviewDetailItem>> {
    return this.apiClient.request<ExamReviewDetailItem>(`/api/v1/results/exam-reviews/${encodeURIComponent(reviewId)}/release/`, {
      method: 'POST',
    });
  }

  setGradingStatus(reviewId: string, status: Extract<ExamReviewQueueStatus, 'SUBMITTED' | 'GRADED'>): Promise<ServiceResult<ExamReviewQueueItem>> {
    return this.apiClient.request<ExamReviewQueueItem>(`/api/v1/results/exam-reviews/${encodeURIComponent(reviewId)}/grading-status/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  uploadAnswerSheet(reviewId: string, file: File, templateSource: ExamReviewTemplateSource = 'STANDARD_CSV'): Promise<ServiceResult<ExamReviewDetailItem>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateSource', templateSource);
    return this.apiClient.request<ExamReviewDetailItem>(`/api/v1/results/exam-reviews/${encodeURIComponent(reviewId)}/answer-sheets/`, {
      method: 'POST',
      body: formData,
    });
  }

  scoreItem(reviewId: string, itemId: string, points: number): Promise<ServiceResult<ExamReviewDetailItem>> {
    return this.apiClient.request<ExamReviewDetailItem>(`/api/v1/results/exam-reviews/${encodeURIComponent(reviewId)}/items/${encodeURIComponent(itemId)}/score/`, {
      method: 'POST',
      body: JSON.stringify({ points }),
    });
  }
}

export const backendExamReviewService = new BackendExamReviewService();
