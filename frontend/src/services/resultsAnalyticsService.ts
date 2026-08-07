import { sharedApiClient } from './apiClient';
import type { ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export interface ResultsScoreBand {
  label: string;
  minimum: number;
  maximum: number;
  count: number;
}

export interface ResultsSessionAggregate {
  sessionId: string;
  sessionName: string;
  releasedCandidates: number;
  meanFinalScore: number | null;
  releasedAt: string | null;
}

export interface ResultsAnalyticsOverview {
  releasedCandidates: number;
  releasedSessions: number;
  meanFinalScore: number | null;
  scoreBands: ResultsScoreBand[];
  sessions: ResultsSessionAggregate[];
}

export class ResultsAnalyticsService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  getOverview(): Promise<ServiceResult<ResultsAnalyticsOverview>> {
    return this.apiClient.request<ResultsAnalyticsOverview>('/api/v1/results/analytics/overview/');
  }
}

export const resultsAnalyticsService = new ResultsAnalyticsService();
