import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendAnalyticsService } from './backendAnalyticsService';
import { createPrototypeAnalyticsService, MockAnalyticsService } from './analyticsService';

describe('MockAnalyticsService', () => {
  it('resolves a national overview synchronously with no network calls', async () => {
    const service = new MockAnalyticsService();

    const result = await service.getNationalOverview();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalRegisteredExaminees).toBeGreaterThan(0);
      expect(result.data.totalVerifiedExaminees).toBeGreaterThan(0);
      expect(result.data.totalParticipatingSchools).toBeGreaterThan(0);
      expect(result.data.totalParticipatingUniversities).toBeGreaterThan(0);
      expect(result.data.regionalBreakdown).toEqual([]);
    }
  });
});

describe('createPrototypeAnalyticsService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a MockAnalyticsService when VITE_AUTH_SERVICE_MODE is not "backend"', () => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'prototype');

    expect(createPrototypeAnalyticsService()).toBeInstanceOf(MockAnalyticsService);
  });

  it('returns a BackendAnalyticsService when VITE_AUTH_SERVICE_MODE is "backend"', () => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'backend');

    expect(createPrototypeAnalyticsService()).toBeInstanceOf(BackendAnalyticsService);
  });
});
