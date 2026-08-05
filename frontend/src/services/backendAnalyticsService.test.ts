import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendAnalyticsService } from './backendAnalyticsService';

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

describe('BackendAnalyticsService', () => {
  it('fetches the national overview from the backend endpoint', async () => {
    const overview = {
      totalRegisteredExaminees: 1240000,
      totalVerifiedExaminees: 1180000,
      totalParticipatingSchools: 12402,
      totalParticipatingUniversities: 2402,
      regionalBreakdown: [{ region: 'NCR', applicationCount: 4500 }],
      generatedAt: '2026-08-02T08:24:17.868767+00:00',
    };
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(overview, { status: 200 }));
    const service = new BackendAnalyticsService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.getNationalOverview();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(overview);
    }
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/analytics/national/overview/',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('maps a 403 response to an authorization error', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: { code: 'PERMISSION_DENIED', message: 'You do not have permission to perform this action.' } },
        { status: 403 },
      ),
    );
    const service = new BackendAnalyticsService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.getNationalOverview();

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.kind).toBe('AUTHORIZATION');
      expect(result.error.code).toBe('PERMISSION_DENIED');
    }
  });
});
