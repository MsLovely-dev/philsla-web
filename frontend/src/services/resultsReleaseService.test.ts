import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { ResultsReleaseService, resultsReleaseService } from './resultsReleaseService';

const summaryPage = {
  count: 1,
  page: 2,
  pageSize: 25,
  results: [{
    id: 'SESSION-2027-REGULAR',
    name: 'PhilSA Regular Examination 2027',
    status: 'SCORING_PROCESSED' as const,
    isClosed: true,
    totalCandidates: 500,
    approvedScores: 471,
    excludedScores: 29,
    processedScores: 471,
    releasedScores: 0,
    processedAt: '2026-08-07T00:00:00Z',
    releasedAt: null,
    processingReady: false,
    releaseReady: true,
  }],
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ResultsReleaseService', () => {
  it('encodes the requested release-summary page filters and preserves its response page', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(summaryPage));
    const service = new ResultsReleaseService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.list({
      page: 2,
      pageSize: 25,
      status: 'SCORING_PROCESSED',
      search: 'regular & special',
    });

    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/release-summary/?page=2&pageSize=25&status=SCORING_PROCESSED&search=regular+%26+special',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(result).toEqual({ ok: true, data: summaryPage });
  });

  it('uses the documented default summary pagination when no filters are supplied', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ ...summaryPage, page: 1 }));
    const service = new ResultsReleaseService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    await service.list();

    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/release-summary/?page=1&pageSize=25',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('processes an encoded session id with backend reprocessing disabled', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      id: 'SESSION/1',
      status: 'SCORING_PROCESSED',
      processingBatchId: 'PROCESS-1',
      processedBy: '42',
      processedCount: 10,
      excludedCount: 1,
    }));
    const service = new ResultsReleaseService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.process('SESSION/1');

    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/score-management/batches/SESSION%2F1/process/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ allowReprocessing: false }), credentials: 'include' }),
    );
    expect(result.ok).toBe(true);
  });

  it('releases an encoded session id with a POST request', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      id: 'SESSION/1',
      status: 'RESULTS_RELEASED',
      releasedCount: 10,
      notificationQueuedCount: 9,
      notificationSkippedCount: 1,
      notificationFailedCount: 0,
    }));
    const service = new ResultsReleaseService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.release('SESSION/1');

    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/score-management/batches/SESSION%2F1/release/',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(result.ok).toBe(true);
  });

  it('returns the standard API failure result without throwing', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      error: { code: 'RELEASE_FORBIDDEN', message: 'You are not authorized to release this session.' },
    }, 403));
    const service = new ResultsReleaseService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    await expect(service.release('SESSION-1')).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({
        kind: 'AUTHORIZATION',
        code: 'RELEASE_FORBIDDEN',
        message: 'You are not authorized to release this session.',
      }),
    });
  });

  it('surfaces the safe backend release-conflict envelope', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      error: {
        code: 'CONFLICT',
        message: 'Scores must be processed before release.',
        fields: {},
        meta: {},
        correlationId: '123e4567-e89b-12d3-a456-426614174000',
      },
    }, 409));
    const service = new ResultsReleaseService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    await expect(service.release('SESSION-1')).resolves.toEqual({
      ok: false,
      error: {
        kind: 'CONFLICT',
        status: 409,
        code: 'CONFLICT',
        message: 'Scores must be processed before release.',
        retryable: false,
        meta: {},
      },
    });
  });

  it.each(['process', 'release'] as const)(
    'does not replay an ambiguous %s mutation across alternative base URLs',
    async (operation) => {
      const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('response connection lost'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const service = new ResultsReleaseService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

      const result = await service[operation]('SESSION-1');

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: expect.objectContaining({ kind: 'NETWORK', retryable: true }),
      });
      consoleError.mockRestore();
    },
  );

  it('exports the singleton service surface needed by the release screen', () => {
    expect(resultsReleaseService).toBeInstanceOf(ResultsReleaseService);
    expect(resultsReleaseService.list).toBeTypeOf('function');
    expect(resultsReleaseService.process).toBeTypeOf('function');
    expect(resultsReleaseService.release).toBeTypeOf('function');
  });
});
