import type { User, UserRole } from '../types';
import type { AuthCredentials, AuthService, AuthSession } from './contracts';
import { createApiClient, type ApiClient } from './apiClient';
import { authorizationError, serviceSuccess } from './serviceResult';
import type { ServiceFailure, ServiceResult } from './serviceResult';

interface BackendSessionResponse {
  user: {
    id: string;
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

export class BackendAuthService implements AuthService {
  constructor(private readonly apiClient: ApiClient = createApiClient()) {}

  async getCurrentSession(): Promise<ServiceResult<AuthSession | null>> {
    const result = await this.apiClient.request<BackendSessionResponse>('/api/v1/auth/session/');

    if (result.ok === false) {
      if (result.error.status === 401 || result.error.code === 'NOT_AUTHENTICATED') {
        return serviceSuccess(null);
      }
      return result as ServiceFailure;
    }

    return serviceSuccess(this.mapSession(result.data));
  }

  async login(credentials: AuthCredentials): Promise<ServiceResult<AuthSession>> {
    const identifierResult = await this.apiClient.request<{ pendingAuthToken: string }>('/api/v1/auth/login/identifier/', {
      method: 'POST',
      body: JSON.stringify({ identifier: credentials.email }),
    });

    if (identifierResult.ok === false) return identifierResult as ServiceFailure;

    if (!credentials.password) {
      return authorizationError('Password is required to continue backend login.', 'PASSWORD_REQUIRED');
    }

    const passwordResult = await this.apiClient.request<{ otpPendingAuthToken: string }>('/api/v1/auth/login/password/', {
      method: 'POST',
      body: JSON.stringify({
        pendingAuthToken: identifierResult.data.pendingAuthToken,
        password: credentials.password,
      }),
    });

    if (passwordResult.ok === false) return passwordResult as ServiceFailure;

    return authorizationError(
      'Backend OTP verification is required. The frontend OTP screen is not wired yet.',
      'OTP_REQUIRED',
    );
  }

  async logout(): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>('/api/v1/auth/logout/', { method: 'POST' });
  }

  async refreshSession(): Promise<ServiceResult<AuthSession>> {
    const result = await this.apiClient.request<{ accessToken: string }>('/api/v1/auth/token/refresh/', { method: 'POST' });
    if (result.ok === false) return result as ServiceFailure;

    const sessionResult = await this.getCurrentSession();
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
      email: '',
      firstName: 'Backend',
      lastName: 'User',
      role: this.mapRole(response.user.role),
    };
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
