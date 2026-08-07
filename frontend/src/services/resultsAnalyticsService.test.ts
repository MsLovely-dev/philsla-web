import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { ResultsAnalyticsService, resultsAnalyticsService } from './resultsAnalyticsService';

const overview = {
  releasedCandidates: 3,
  releasedSessions: 1,
  meanFinalScore: 82.5,
  scoreBands: [
    { label: '0-59.99', minimum: 0, maximum: 59.99, count: 0 },
    { label: '60-69.99', minimum: 60, maximum: 69.99, count: 0 },
    { label: '70-79.99', minimum: 70, maximum: 79.99, count: 1 },
    { label: '80-89.99', minimum: 80, maximum: 89.99, count: 1 },
    { label: '90-100', minimum: 90, maximum: 100, count: 1 },
  ],
  sessions: [{
    sessionId: 'SESSION-2027-REGULAR',
    sessionName: 'PhilSA Regular Examination 2027',
    releasedCandidates: 3,
    meanFinalScore: 82.5,
    releasedAt: '2026-08-03T08:00:00+00:00',
  }],
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ResultsAnalyticsService', () => {
  it('loads released-results aggregates from the documented endpoint and preserves its response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(overview));
    const service = new ResultsAnalyticsService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.getOverview();

    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/analytics/overview/',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(result).toEqual({ ok: true, data: overview });
  });

  it('returns the standard API failure result without throwing', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      error: { code: 'ANALYTICS_FORBIDDEN', message: 'You are not authorized to view released results analytics.' },
    }, 403));
    const service = new ResultsAnalyticsService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    await expect(service.getOverview()).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({
        kind: 'AUTHORIZATION',
        code: 'ANALYTICS_FORBIDDEN',
        message: 'You are not authorized to view released results analytics.',
      }),
    });
  });

  it('exports the singleton service surface needed by the reporting matrix', () => {
    expect(resultsAnalyticsService).toBeInstanceOf(ResultsAnalyticsService);
    expect(resultsAnalyticsService.getOverview).toBeTypeOf('function');
  });
});
