import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendResultService, MockResultService } from './backendResultService';

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

const apiResult = {
  id: 'SCORE-CAND-1',
  candidateId: 'CAND-1',
  rawScore: 180,
  maxScore: 200,
  finalScore: 90.0,
  overallRank: 5,
  percentile: 95.0,
  releaseStatus: 'RELEASED' as const,
  releasedAt: '2026-08-01T00:00:00Z',
  examSetId: 'ES-TEST0001',
  sessionId: 'SESSION-TEST',
};

describe('BackendResultService', () => {
  it("fetches and returns the caller's own result", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(apiResult, { status: 200 }));
    const service = new BackendResultService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.getMyResult();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(apiResult);
    expect(fetcher).toHaveBeenCalledWith('http://backend.test/api/v1/results/me/', expect.objectContaining({}));
  });

  it('returns null when no result exists yet', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(null, { status: 200 }));
    const service = new BackendResultService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.getMyResult();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });
});

describe('MockResultService', () => {
  it("always resolves to null (ResultsPage owns its own prototype-mode mock data)", async () => {
    const service = new MockResultService();

    const result = await service.getMyResult();

    expect(result).toEqual({ ok: true, data: null });
  });
});
