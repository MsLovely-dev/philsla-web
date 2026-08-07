import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type ServiceResult } from './serviceResult';

export interface MyResult {
  id: string;
  candidateId: string;
  rawScore: number;
  maxScore: number;
  finalScore: number;
  overallRank: number | null;
  percentile: number | null;
  releaseStatus: 'NOT_RELEASED' | 'RELEASED';
  releasedAt: string | null;
  examSetId: string;
  sessionId: string;
}

export interface ResultService {
  getMyResult(): Promise<ServiceResult<MyResult | null>>;
}

const MY_RESULT_ENDPOINT = '/api/v1/results/me/';

export class BackendResultService implements ResultService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  getMyResult(): Promise<ServiceResult<MyResult | null>> {
    return this.apiClient.request<MyResult | null>(MY_RESULT_ENDPOINT);
  }
}

/**
 * In prototype mode, ResultsPage.tsx keeps its own hardcoded mock preview
 * data rather than reading it from this service -- this always resolves to
 * null so the backend-mode branch and the prototype-mode branch stay fully
 * decoupled, matching how ExamPermitPage.tsx's `permits` mock array is
 * unrelated to `BackendApplicationService.getMyExamPermit()`.
 */
export class MockResultService implements ResultService {
  async getMyResult(): Promise<ServiceResult<MyResult | null>> {
    return serviceSuccess(null);
  }
}

export function createResultService(): ResultService {
  if (import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend') {
    return new BackendResultService();
  }
  return new MockResultService();
}

export const resultService = createResultService();
