import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

describe('ApiClient', () => {
  it('refreshes an expired bearer token and retries a protected request once', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(
        { error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid or expired bearer token.', fields: {} } },
        { status: 401 },
      ))
      .mockResolvedValueOnce(jsonResponse(
        {
          accessToken: 'fresh-access-token',
          tokenType: 'Bearer',
          expiresInSeconds: 1200,
          expiresAt: '2026-07-13T10:20:00Z',
        },
        { status: 200 },
      ))
      .mockResolvedValueOnce(jsonResponse({ applications: [] }, { status: 200 }));
    const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
    client.setBearerToken('expired-access-token');

    const result = await client.request<{ applications: unknown[] }>('/api/v1/applications/review-queue/');

    expect(result).toEqual({ ok: true, data: { applications: [] } });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'http://backend.test/api/v1/applications/review-queue/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer expired-access-token' }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'http://backend.test/api/v1/auth/token/refresh/',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      'http://backend.test/api/v1/applications/review-queue/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fresh-access-token' }),
      }),
    );
  });

  it('refreshes an expired bearer token and retries a protected blob request once', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(
        { error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid or expired bearer token.', fields: {} } },
        { status: 401 },
      ))
      .mockResolvedValueOnce(jsonResponse(
        {
          accessToken: 'fresh-access-token',
          tokenType: 'Bearer',
          expiresInSeconds: 1200,
          expiresAt: '2026-07-13T10:20:00Z',
        },
        { status: 200 },
      ))
      .mockResolvedValueOnce(new Response('candidate_id\nPHL-2027-000001\n', { status: 200, headers: { 'Content-Type': 'text/csv' } }));
    const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
    client.setBearerToken('expired-access-token');

    const result = await client.requestBlob('/api/v1/results/score-management/batches/SESSION-2027-REGULAR/export/');

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'http://backend.test/api/v1/results/score-management/batches/SESSION-2027-REGULAR/export/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer expired-access-token' }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      'http://backend.test/api/v1/results/score-management/batches/SESSION-2027-REGULAR/export/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fresh-access-token' }),
      }),
    );
  });

  it('does not refresh for auth-flow failures', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(
      { error: { code: 'AUTHENTICATION_FAILED', message: 'Identifier not found or invalid.', fields: {} } },
      { status: 401 },
    ));
    const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
    client.setBearerToken('existing-access-token');

    const result = await client.request('/api/v1/auth/login/identifier/', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'missing@example.test' }),
    });

    expect(result.ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('clears the bearer token when refresh fails', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(
        { error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid or expired bearer token.', fields: {} } },
        { status: 401 },
      ))
      .mockResolvedValueOnce(jsonResponse(
        { error: { code: 'AUTHENTICATION_FAILED', message: 'Your session has expired.', fields: {} } },
        { status: 401 },
      ))
      .mockResolvedValueOnce(jsonResponse({ applications: [] }, { status: 200 }));
    const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
    client.setBearerToken('expired-access-token');

    const result = await client.request('/api/v1/applications/review-queue/');
    await client.request('/api/v1/applications/review-queue/');

    expect(result.ok).toBe(false);
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      'http://backend.test/api/v1/applications/review-queue/',
      expect.objectContaining({
        headers: expect.not.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it('does not replay an ambiguous POST across alternative base URLs when fallback is disabled', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('response connection lost'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });

    const result = await client.request(
      '/api/v1/results/score-management/batches/SESSION-1/release/',
      { method: 'POST' },
      { allowAlternativeBaseUrlFallback: false },
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/results/score-management/batches/SESSION-1/release/',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'NETWORK', retryable: true }),
    });
    consoleError.mockRestore();
  });
});
