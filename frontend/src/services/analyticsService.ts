import { NATIONAL_STATS } from './analyticsMockData';
import { BackendAnalyticsService } from './backendAnalyticsService';
import type { AnalyticsService, NationalOverview } from './contracts';
import { serviceSuccess } from './serviceResult';
import type { ServiceResult } from './serviceResult';

function parseCount(value: string): number {
  const numeric = value.replace(/[^0-9.]/g, '');
  const parsed = Number.parseFloat(numeric);
  if (Number.isNaN(parsed)) return 0;
  return value.toUpperCase().includes('M') ? Math.round(parsed * 1_000_000) : Math.round(parsed);
}

function mockNationalOverview(): NationalOverview {
  const byLabel = Object.fromEntries(NATIONAL_STATS.map((stat) => [stat.label, stat.value]));
  return {
    totalRegisteredExaminees: parseCount(byLabel['Total Registered Examinees'] ?? '0'),
    totalVerifiedExaminees: parseCount(byLabel['Total Verified Examinees'] ?? '0'),
    totalParticipatingSchools: parseCount(byLabel['Total Participating Schools'] ?? '0'),
    totalParticipatingUniversities: parseCount(byLabel['Total Participating Universities'] ?? '0'),
    regionalBreakdown: [],
    generatedAt: new Date().toISOString(),
  };
}

export class MockAnalyticsService implements AnalyticsService {
  async getNationalOverview(): Promise<ServiceResult<NationalOverview>> {
    return serviceSuccess(mockNationalOverview());
  }
}

export function createPrototypeAnalyticsService(): AnalyticsService {
  if (import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend') {
    return new BackendAnalyticsService();
  }

  return new MockAnalyticsService();
}

export const analyticsService = createPrototypeAnalyticsService();
