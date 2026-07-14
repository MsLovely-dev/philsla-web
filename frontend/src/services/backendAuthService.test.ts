import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendAuthService } from './backendAuthService';

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

describe('BackendAuthService', () => {
  it('maps an unauthenticated session with no valid refresh cookie to a null session', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(
        {
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication credentials were not provided.',
            fields: {},
            correlationId: 'correlation-id',
          },
        },
        { status: 401 },
      ))
      .mockResolvedValueOnce(jsonResponse(
        {
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Refresh token is missing or invalid.',
            fields: {},
            correlationId: 'correlation-id',
          },
        },
        { status: 401 },
      ));
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.getCurrentSession();

    expect(result).toEqual({ ok: true, data: null });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/auth/session/',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/auth/token/refresh/',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('restores a backend session from the refresh cookie after a page reload', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required.', fields: {} } },
        { status: 401 },
      ))
      .mockResolvedValueOnce(jsonResponse(
        {
          accessToken: 'restored-access-token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          expiresAt: '2026-07-13T10:00:00Z',
        },
        { status: 200 },
      ))
      .mockResolvedValueOnce(jsonResponse(
        {
          user: {
            id: 'restored-user',
            role: 'SYSTEM_ADMIN',
            securityTier: 3,
            permissions: [],
            scopes: {},
          },
          session: {
            authenticated: true,
            expiresAt: '2026-07-13T10:00:00Z',
          },
        },
        { status: 200 },
      ));
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.getCurrentSession();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.user).toMatchObject({ id: 'restored-user', role: 'SYSTEM_ADMIN' });
    }
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      'http://backend.test/api/v1/auth/session/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer restored-access-token' }),
      }),
    );
  });

  it('maps backend session claims into the existing frontend session shape', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          user: {
            id: 'user-123',
            role: 'SYSTEM_ADMIN',
            securityTier: 3,
            permissions: [],
            scopes: {},
          },
          session: {
            authenticated: true,
            expiresAt: '2026-07-13T10:00:00Z',
          },
        },
        { status: 200 },
      ),
    );
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.getCurrentSession();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.user).toMatchObject({ id: 'user-123', role: 'SYSTEM_ADMIN' });
      expect(result.data?.expiresAt).toBe('2026-07-13T10:00:00Z');
    }
  });

  it('uses backend login boundary and maps safe backend auth errors', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Identifier not found or invalid. Please check and try again.',
            fields: {},
            correlationId: 'correlation-id',
          },
        },
        { status: 401 },
      ),
    );
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.login({ email: 'student@example.test', password: 'Password1!' });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.kind).toBe('AUTHORIZATION');
      expect(result.error.code).toBe('AUTHENTICATION_FAILED');
    }
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/auth/login/identifier/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'student@example.test' }),
      }),
    );
  });

  it('completes local dev backend login when the backend exposes a dev OTP', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            pendingAuthToken: 'identifier-token',
            nextStep: 'password',
            expiresInSeconds: 600,
          },
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            otpPendingAuthToken: 'otp-token',
            nextStep: 'otp',
            expiresInSeconds: 300,
            resendCooldownSeconds: 60,
            devOtp: '123456',
          },
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            accessToken: 'access-token',
            tokenType: 'Bearer',
            expiresInSeconds: 900,
            expiresAt: '2026-07-13T10:00:00Z',
          },
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            user: {
              id: 'dev-student',
              role: 'STUDENT',
              securityTier: 1,
              permissions: [],
              scopes: {},
            },
            session: {
              authenticated: true,
              expiresAt: '2026-07-13T10:00:00Z',
            },
          },
          { status: 200 },
        ),
      );
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.login({ email: 'student@example.test', password: 'Password1!' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user).toMatchObject({ id: 'dev-student', role: 'STUDENT' });
    }
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      'http://backend.test/api/v1/auth/login/otp/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ otpPendingAuthToken: 'otp-token', code: '123456' }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      'http://backend.test/api/v1/auth/session/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });
});
