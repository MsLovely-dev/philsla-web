import type { BackendPortalRole, User, UserRole } from '../types';
import type { AuthCredentials, AuthIdentifierChallenge, AuthOtpChallenge, AuthSelfieChallenge, AuthService, AuthSession, PasswordRecoveryInspection, PasswordRecoveryRequestResult } from './contracts';
import { sharedApiClient, type ApiClient } from './apiClient';
import { authorizationError, serviceSuccess } from './serviceResult';
import type { ServiceFailure, ServiceResult } from './serviceResult';

interface BackendSessionResponse {
  user: {
    id: string;
    email?: string;
    role: string | null;
    securityTier: number | null;
    permissions: string[];
    scopes: Record<string, unknown>;
  };
  session: {
    authenticated: boolean;
    expiresAt: string | null;
  };
}

interface BackendTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  expiresAt: string;
}

export class BackendAuthService implements AuthService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async getCurrentSession(): Promise<ServiceResult<AuthSession | null>> {
    if (!this.apiClient.hasBearerToken()) {
      const refreshResult = await this.refreshSession();
      if (refreshResult.ok === true) return serviceSuccess(refreshResult.data);
      if (refreshResult.error.status === 401 || refreshResult.error.code === 'NOT_AUTHENTICATED') {
        return serviceSuccess(null);
      }
      return refreshResult as ServiceFailure;
    }

    const result = await this.requestCurrentSession();

    if (result.ok === false && (result.error.status === 401 || result.error.code === 'NOT_AUTHENTICATED')) {
      const refreshResult = await this.refreshSession();
      if (refreshResult.ok === true) return serviceSuccess(refreshResult.data);
      if (refreshResult.error.status === 401 || refreshResult.error.code === 'NOT_AUTHENTICATED') {
        return serviceSuccess(null);
      }
      return refreshResult as ServiceFailure;
    }

    return result;
  }

  private async requestCurrentSession(): Promise<ServiceResult<AuthSession | null>> {
    const result = await this.apiClient.request<BackendSessionResponse>('/api/v1/auth/session/');

    if (result.ok === false) return result as ServiceFailure;

    return serviceSuccess(this.mapSession(result.data));
  }

  async login(credentials: AuthCredentials): Promise<ServiceResult<AuthSession>> {
    const identifierResult = await this.startLoginIdentifier(credentials.email);

    if (identifierResult.ok === false) return identifierResult as ServiceFailure;
    if (identifierResult.data.nextStep === 'activation') {
      return authorizationError('Set your account password before continuing.', 'ACTIVATION_REQUIRED');
    }

    if (!credentials.password) {
      return authorizationError('Password is required to continue backend login.', 'PASSWORD_REQUIRED');
    }

    const passwordResult = await this.verifyLoginPassword(identifierResult.data.pendingAuthToken ?? '', credentials.password);

    if (passwordResult.ok === false) return passwordResult as ServiceFailure;

    if (!credentials.otp) {
      return authorizationError(
        'Backend OTP verification is required. Enter the 6-digit email code to continue.',
        'OTP_REQUIRED',
      );
    }

    const otpResult = await this.verifyLoginOtp(passwordResult.data.otpPendingAuthToken, credentials.otp);
    if (otpResult.ok === false) return otpResult as ServiceFailure;
    return authorizationError('Selfie photo log is required before creating the backend session.', 'SELFIE_REQUIRED');
  }

  async startLoginIdentifier(identifier: string): Promise<ServiceResult<AuthIdentifierChallenge>> {
    return this.apiClient.request<AuthIdentifierChallenge>('/api/v1/auth/login/identifier/', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  }

  async verifyLoginPassword(pendingAuthToken: string, password: string): Promise<ServiceResult<AuthOtpChallenge>> {
    return this.apiClient.request<AuthOtpChallenge>('/api/v1/auth/login/password/', {
      method: 'POST',
      body: JSON.stringify({
        pendingAuthToken,
        password,
      }),
    });
  }

  async completeStaffActivation(
    activationToken: string,
    password: string,
    confirmPassword: string,
  ): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>('/api/v1/auth/activation/staff/complete/', {
      method: 'POST',
      body: JSON.stringify({
        activationToken,
        password,
        confirmPassword,
      }),
    });
  }

  async verifyLoginOtp(otpPendingAuthToken: string, code: string): Promise<ServiceResult<AuthSelfieChallenge>> {
    return this.apiClient.request<AuthSelfieChallenge>('/api/v1/auth/login/otp/', {
      method: 'POST',
      body: JSON.stringify({
        otpPendingAuthToken,
        code,
      }),
    });
  }

  async resendLoginOtp(otpPendingAuthToken: string): Promise<ServiceResult<AuthOtpChallenge>> {
    return this.apiClient.request<AuthOtpChallenge>('/api/v1/auth/login/otp/resend/', {
      method: 'POST',
      body: JSON.stringify({
        otpPendingAuthToken,
      }),
    });
  }

  async completeLoginSelfie(selfiePendingAuthToken: string, file: File): Promise<ServiceResult<AuthSession>> {
    const body = new FormData();
    body.append('selfiePendingAuthToken', selfiePendingAuthToken);
    body.append('file', file);

    const selfieResult = await this.apiClient.request<BackendTokenResponse>('/api/v1/auth/login/selfie/', {
      method: 'POST',
      body,
    });

    if (selfieResult.ok === false) return selfieResult as ServiceFailure;

    this.apiClient.setBearerToken(selfieResult.data.accessToken);
    const sessionResult = await this.requestCurrentSession();
    if (sessionResult.ok === false) return sessionResult as ServiceFailure;
    if (!sessionResult.data) return authorizationError('The backend session was not created.', 'SESSION_NOT_CREATED');
    return serviceSuccess(sessionResult.data);
  }

  async requestPasswordRecovery(identifier: string): Promise<ServiceResult<PasswordRecoveryRequestResult>> {
    return this.apiClient.request<PasswordRecoveryRequestResult>('/api/v1/auth/recovery/password/request/', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  }

  async inspectPasswordRecovery(recoveryToken: string): Promise<ServiceResult<PasswordRecoveryInspection>> {
    return this.apiClient.request<PasswordRecoveryInspection>('/api/v1/auth/recovery/password/inspect/', {
      method: 'POST',
      body: JSON.stringify({ recoveryToken }),
    });
  }

  async completePasswordRecovery(
    recoveryToken: string,
    password: string,
    confirmPassword: string,
  ): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>('/api/v1/auth/recovery/password/complete/', {
      method: 'POST',
      body: JSON.stringify({
        recoveryToken,
        password,
        confirmPassword,
      }),
    });
  }

  async logout(): Promise<ServiceResult<null>> {
    const result = await this.apiClient.request<null>('/api/v1/auth/logout/', { method: 'POST' });
    this.apiClient.setBearerToken(null);
    return result;
  }

  async refreshSession(): Promise<ServiceResult<AuthSession>> {
    const result = await this.apiClient.request<BackendTokenResponse>('/api/v1/auth/token/refresh/', { method: 'POST' });
    if (result.ok === false) return result as ServiceFailure;

    this.apiClient.setBearerToken(result.data.accessToken);
    const sessionResult = await this.requestCurrentSession();
    if (sessionResult.ok === false) return sessionResult as ServiceFailure;
    if (!sessionResult.data) return authorizationError('The backend session has expired.', 'SESSION_EXPIRED');
    return serviceSuccess(sessionResult.data);
  }

  private mapSession(response: BackendSessionResponse): AuthSession {
    return {
      user: this.mapUser(response),
      issuedAt: new Date().toISOString(),
      expiresAt: response.session.expiresAt ?? undefined,
    };
  }

  private mapUser(response: BackendSessionResponse): User {
    return {
      id: response.user.id,
      email: response.user.email ?? '',
      firstName: 'Backend',
      lastName: 'User',
      role: this.mapRole(response.user.role),
      backendRole: this.mapBackendRole(response.user.role),
      permissions: response.user.permissions,
    };
  }

  private mapBackendRole(role: string | null): BackendPortalRole | undefined {
    const backendRoles: BackendPortalRole[] = [
      'STUDENT',
      'ADMISSIONS_REVIEWER',
      'ITEM_WRITER',
      'ACADEMIC_REVIEWER',
      'PROCTOR',
      'PROCTOR_ADMIN',
      'UNIVERSITY_ADMIN',
      'TESTING_CENTER_ADMIN',
      'EXAM_ADMINISTRATOR',
      'SYSTEM_ADMIN',
      'CHED_ADMIN',
      'DEPED_ADMIN',
      'TESDA_ADMIN',
      'EXECUTIVE',
    ];

    return backendRoles.includes(role as BackendPortalRole) ? (role as BackendPortalRole) : undefined;
  }

  private mapRole(role: string | null): UserRole {
    if (role === 'CHED_ADMIN' || role === 'DEPED_ADMIN' || role === 'TESDA_ADMIN') return 'GOVERNMENT';
    if (role === 'EXAM_ADMIN') return 'EXAM_ADMINISTRATOR';

    const frontendRoles: UserRole[] = [
      'STUDENT',
      'ADMISSIONS_REVIEWER',
      'UNIVERSITY_ADMIN',
      'ITEM_WRITER',
      'ACADEMIC_REVIEWER',
      'PROCTOR',
      'PROCTOR_ADMIN',
      'GRADER',
      'SYSTEM_ADMIN',
      'EXECUTIVE',
      'GOVERNMENT',
      'EXAM_ADMINISTRATOR',
      'TESTING_CENTER_ADMIN',
      'TECH_SUPPORT',
    ];

    return frontendRoles.includes(role as UserRole) ? (role as UserRole) : 'STUDENT';
  }
}
