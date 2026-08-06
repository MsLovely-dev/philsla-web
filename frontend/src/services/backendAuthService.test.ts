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
    const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse(
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
      'http://backend.test/api/v1/auth/token/refresh/',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('restores a backend session from the refresh cookie after a page reload', async () => {
    const fetcher = vi
      .fn()
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
      2,
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
            permissions: ['MOD_31_READ'],
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
    const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
    client.setBearerToken('access-token');
    const service = new BackendAuthService(client);

    const result = await service.getCurrentSession();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.user).toMatchObject({ id: 'user-123', role: 'SYSTEM_ADMIN', permissions: ['MOD_31_READ'] });
      expect(result.data?.expiresAt).toBe('2026-07-13T10:00:00Z');
    }
  });

  it('retains the exact backend role alongside the existing frontend display role', async () => {
    function sessionFetcher(backendRole: string) {
      return vi.fn().mockResolvedValue(
        jsonResponse(
          {
            user: {
              id: `user-${backendRole}`,
              role: backendRole,
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
    }

    const depedClient = new ApiClient({ baseUrl: 'http://backend.test', fetcher: sessionFetcher('DEPED_ADMIN') });
    depedClient.setBearerToken('access-token');
    const depedSession = await new BackendAuthService(depedClient).getCurrentSession();
    expect(depedSession.ok).toBe(true);
    if (depedSession.ok) {
      expect(depedSession.data?.user).toMatchObject({ role: 'GOVERNMENT', backendRole: 'DEPED_ADMIN' });
    }

    const chedClient = new ApiClient({ baseUrl: 'http://backend.test', fetcher: sessionFetcher('CHED_ADMIN') });
    chedClient.setBearerToken('access-token');
    const chedSession = await new BackendAuthService(chedClient).getCurrentSession();
    expect(chedSession.ok).toBe(true);
    if (chedSession.ok) {
      expect(chedSession.data?.user).toMatchObject({ role: 'GOVERNMENT', backendRole: 'CHED_ADMIN' });
    }

    const tesdaClient = new ApiClient({ baseUrl: 'http://backend.test', fetcher: sessionFetcher('TESDA_ADMIN') });
    tesdaClient.setBearerToken('access-token');
    const tesdaSession = await new BackendAuthService(tesdaClient).getCurrentSession();
    expect(tesdaSession.ok).toBe(true);
    if (tesdaSession.ok) {
      expect(tesdaSession.data?.user).toMatchObject({ role: 'GOVERNMENT', backendRole: 'TESDA_ADMIN' });
    }

    const systemClient = new ApiClient({ baseUrl: 'http://backend.test', fetcher: sessionFetcher('SYSTEM_ADMIN') });
    systemClient.setBearerToken('access-token');
    const systemSession = await new BackendAuthService(systemClient).getCurrentSession();
    expect(systemSession.ok).toBe(true);
    if (systemSession.ok) {
      expect(systemSession.data?.user).toMatchObject({ role: 'SYSTEM_ADMIN', backendRole: 'SYSTEM_ADMIN' });
    }
  });

  it('never accepts an unrecognized backend role value as backendRole', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          user: {
            id: 'user-unknown',
            role: 'SOMETHING_UNEXPECTED',
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
    const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
    client.setBearerToken('access-token');
    const service = new BackendAuthService(client);

    const result = await service.getCurrentSession();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.user.backendRole).toBeUndefined();
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

  it('completes backend login after email OTP and selfie photo log', async () => {
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
          },
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            selfiePendingAuthToken: 'selfie-token',
            nextStep: 'selfie',
            expiresInSeconds: 600,
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

    await service.startLoginIdentifier('student@example.test');
    await service.verifyLoginPassword('identifier-token', 'Password1!');
    const otpResult = await service.verifyLoginOtp('otp-token', '123456');

    expect(otpResult).toEqual({
      ok: true,
      data: {
        selfiePendingAuthToken: 'selfie-token',
        nextStep: 'selfie',
        expiresInSeconds: 600,
      },
    });
    const result = await service.completeLoginSelfie(
      'selfie-token',
      new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' }),
    );
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
      'http://backend.test/api/v1/auth/login/selfie/',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      5,
      'http://backend.test/api/v1/auth/session/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('submits first-login staff activation password setup to the backend', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.completeStaffActivation('activation-token', 'Password1!', 'Password1!');

    expect(result).toEqual({ ok: true, data: null });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/auth/activation/staff/complete/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          activationToken: 'activation-token',
          password: 'Password1!',
          confirmPassword: 'Password1!',
        }),
      }),
    );
  });

  it('requests a replacement login OTP from the backend', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          otpPendingAuthToken: 'otp-token',
          nextStep: 'otp',
          expiresInSeconds: 240,
          resendCooldownSeconds: 60,
        },
        { status: 202 },
      ),
    );
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.resendLoginOtp('otp-token');

    expect(result).toEqual({
      ok: true,
      data: {
        otpPendingAuthToken: 'otp-token',
        nextStep: 'otp',
        expiresInSeconds: 240,
        resendCooldownSeconds: 60,
      },
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/auth/login/otp/resend/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ otpPendingAuthToken: 'otp-token' }),
      }),
    );
  });

  it('requests password recovery from the backend', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        { detail: 'If the account can be recovered, instructions will be sent to the verified email address.' },
        { status: 202 },
      ),
    );
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.requestPasswordRecovery('student@example.test');

    expect(result).toEqual({
      ok: true,
      data: { detail: 'If the account can be recovered, instructions will be sent to the verified email address.' },
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/auth/recovery/password/request/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'student@example.test' }),
      }),
    );
  });

  it('submits password recovery completion to the backend', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.completePasswordRecovery('recovery-token', 'Password2!', 'Password2!');

    expect(result).toEqual({ ok: true, data: null });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/auth/recovery/password/complete/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          recoveryToken: 'recovery-token',
          password: 'Password2!',
          confirmPassword: 'Password2!',
        }),
      }),
    );
  });

  it('inspects a password recovery token for safe account display', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          accountLabel: 'cha***@gmail.com',
          maskedEmail: 'cha***@gmail.com',
        },
        { status: 200 },
      ),
    );
    const service = new BackendAuthService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.inspectPasswordRecovery('recovery-token');

    expect(result).toEqual({
      ok: true,
      data: {
        accountLabel: 'cha***@gmail.com',
        maskedEmail: 'cha***@gmail.com',
      },
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/auth/recovery/password/inspect/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ recoveryToken: 'recovery-token' }),
      }),
    );
  });
});
