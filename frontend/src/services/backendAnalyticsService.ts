import { sharedApiClient, type ApiClient } from './apiClient';
import type { AnalyticsService, NationalOverview } from './contracts';
import type { ServiceResult } from './serviceResult';

export class BackendAnalyticsService implements AnalyticsService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async getNationalOverview(): Promise<ServiceResult<NationalOverview>> {
    return this.apiClient.request<NationalOverview>('/api/v1/analytics/national/overview/');
  }
}
