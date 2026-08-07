import { sharedApiClient } from './apiClient';
import type { ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export type ResultsReleaseStatus =
  | 'READY_FOR_PROCESSING'
  | 'SCORING_PROCESSED'
  | 'RESULTS_RELEASED';

export interface ResultsReleaseSummary {
  id: string;
  name: string;
  status: ResultsReleaseStatus;
  isClosed: boolean;
  totalCandidates: number;
  approvedScores: number;
  excludedScores: number;
  processedScores: number;
  releasedScores: number;
  processedAt: string | null;
  releasedAt: string | null;
  processingReady: boolean;
  releaseReady: boolean;
}

export interface ResultsReleaseSummaryPage {
  count: number;
  page: number;
  pageSize: number;
  results: ResultsReleaseSummary[];
}

export interface ResultsReleaseListFilters {
  page?: number;
  pageSize?: number;
  status?: ResultsReleaseStatus;
  search?: string;
}

export interface ResultsReleaseProcessResponse {
  id: string;
  status: 'SCORING_PROCESSED';
  processingBatchId: string;
  processedBy: string | null;
  processedCount: number;
  excludedCount: number;
}

export interface ResultsReleaseResponse {
  id: string;
  status: 'RESULTS_RELEASED';
  releasedCount: number;
  notificationQueuedCount: number;
  notificationSkippedCount: number;
  notificationFailedCount: number;
}

export class ResultsReleaseService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  list(filters: ResultsReleaseListFilters = {}): Promise<ServiceResult<ResultsReleaseSummaryPage>> {
    const query = new URLSearchParams({
      page: String(filters.page ?? 1),
      pageSize: String(filters.pageSize ?? 25),
    });
    if (filters.status) query.set('status', filters.status);
    const search = filters.search?.trim();
    if (search) query.set('search', search);

    return this.apiClient.request<ResultsReleaseSummaryPage>(
      `/api/v1/results/release-summary/?${query.toString()}`,
    );
  }

  process(sessionId: string): Promise<ServiceResult<ResultsReleaseProcessResponse>> {
    return this.apiClient.request<ResultsReleaseProcessResponse>(
      `/api/v1/results/score-management/batches/${encodeURIComponent(sessionId)}/process/`,
      { method: 'POST', body: JSON.stringify({ allowReprocessing: false }) },
      { allowAlternativeBaseUrlFallback: false },
    );
  }

  release(sessionId: string): Promise<ServiceResult<ResultsReleaseResponse>> {
    return this.apiClient.request<ResultsReleaseResponse>(
      `/api/v1/results/score-management/batches/${encodeURIComponent(sessionId)}/release/`,
      { method: 'POST' },
      { allowAlternativeBaseUrlFallback: false },
    );
  }
}

export const resultsReleaseService = new ResultsReleaseService();
