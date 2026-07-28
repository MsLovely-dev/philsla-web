import type { Application, User } from '../types';
import { MOCK_USERS } from '../lib/utils';
import { BackendAuthService } from './backendAuthService';
import type { AuthCredentials, AuthIdentifierChallenge, AuthOtpChallenge, AuthSelfieChallenge, AuthService, AuthSession } from './contracts';
import { authorizationError, serviceSuccess, validationError } from './serviceResult';
import type { ServiceResult } from './serviceResult';

interface PrototypeAuthServiceOptions {
  users: User[];
  storage: Storage;
  sessionStorageKey?: string;
  applicationStorageKey?: string;
  delayMs?: number;
}

export class LocalStorageAuthService implements AuthService {
  private readonly sessionStorageKey: string;
  private readonly applicationStorageKey: string;
  private readonly delayMs: number;
  private pendingIdentifier: string | null = null;
  private pendingSelfieIdentifier: string | null = null;

  constructor(private readonly options: PrototypeAuthServiceOptions) {
    this.sessionStorageKey = options.sessionStorageKey ?? 'philsa_user';
    this.applicationStorageKey = options.applicationStorageKey ?? 'philsa_apps';
    this.delayMs = options.delayMs ?? 800;
  }

  async getCurrentSession(): Promise<ServiceResult<AuthSession | null>> {
    const user = this.readSessionUser();
    return serviceSuccess(user ? this.createSession(user) : null);
  }

  async login(credentials: AuthCredentials): Promise<ServiceResult<AuthSession>> {
    await this.delay();

    const email = credentials.email.trim().toLowerCase();

    if (!email) {
      return validationError('Email is required.', {
        email: ['Enter the email address for the prototype account.'],
      });
    }

    const user = this.findUser(email) ?? this.findStudentFromSavedApplication(email);

    if (!user) {
      return authorizationError('No prototype account matches that email.', 'INVALID_CREDENTIALS');
    }

    this.options.storage.setItem(this.sessionStorageKey, JSON.stringify(user));
    return serviceSuccess(this.createSession(user));
  }

  async startLoginIdentifier(identifier: string): Promise<ServiceResult<AuthIdentifierChallenge>> {
    await this.delay();
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = this.findUser(normalizedIdentifier) ?? this.findStudentFromSavedApplication(normalizedIdentifier);

    if (!user) {
      return authorizationError('Email not found or invalid. Please check and try again.', 'AUTHENTICATION_FAILED');
    }

    this.pendingIdentifier = normalizedIdentifier;
    return serviceSuccess({
      pendingAuthToken: 'prototype-pending-auth',
      nextStep: 'password',
      expiresInSeconds: 600,
    });
  }

  async verifyLoginPassword(_pendingAuthToken: string, password: string): Promise<ServiceResult<AuthOtpChallenge>> {
    await this.delay();

    if (!this.pendingIdentifier) {
      return authorizationError('Your session has expired. Please start again.', 'AUTHENTICATION_FAILED');
    }

    if (!password) {
      return authorizationError('Incorrect email or password.', 'AUTHENTICATION_FAILED');
    }

    return serviceSuccess({
      otpPendingAuthToken: 'prototype-otp-pending-auth',
      nextStep: 'otp',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      devOtp: '000000',
    });
  }

  async verifyLoginOtp(_otpPendingAuthToken: string, code: string): Promise<ServiceResult<AuthSelfieChallenge>> {
    await this.delay();

    if (!this.pendingIdentifier || code !== '000000') {
      return authorizationError('Invalid or expired code. Please try again.', 'AUTHENTICATION_FAILED');
    }

    this.pendingSelfieIdentifier = this.pendingIdentifier;
    this.pendingIdentifier = null;
    return serviceSuccess({
      selfiePendingAuthToken: 'prototype-selfie-pending-auth',
      nextStep: 'selfie',
      expiresInSeconds: 600,
    });
  }

  async resendLoginOtp(_otpPendingAuthToken: string): Promise<ServiceResult<AuthOtpChallenge>> {
    await this.delay();

    if (!this.pendingIdentifier) {
      return authorizationError('Invalid or expired code. Please try again.', 'AUTHENTICATION_FAILED');
    }

    return serviceSuccess({
      otpPendingAuthToken: 'prototype-otp-pending-auth',
      nextStep: 'otp',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      devOtp: '000000',
    });
  }

  async completeLoginSelfie(_selfiePendingAuthToken: string, file: File): Promise<ServiceResult<AuthSession>> {
    await this.delay();

    if (!this.pendingSelfieIdentifier || file.size <= 0) {
      return authorizationError('Capture a selfie before continuing.', 'AUTHENTICATION_FAILED');
    }

    const session = await this.login({ email: this.pendingSelfieIdentifier });
    this.pendingSelfieIdentifier = null;
    return session;
  }

  async logout(): Promise<ServiceResult<null>> {
    this.options.storage.removeItem(this.sessionStorageKey);
    return serviceSuccess(null);
  }

  async refreshSession(): Promise<ServiceResult<AuthSession>> {
    const user = this.readSessionUser();

    if (!user) {
      return authorizationError('The prototype session has expired.', 'SESSION_EXPIRED');
    }

    return serviceSuccess(this.createSession(user));
  }

  private findUser(email: string): User | undefined {
    return this.options.users.find((user) => user.email.toLowerCase() === email);
  }

  private findStudentFromSavedApplication(email: string): User | undefined {
    const applications = this.readSavedApplications();
    const application = applications.find((item) => item.email.toLowerCase() === email);

    if (!application) return undefined;

    return {
      id: application.userId || application.id,
      email: application.email,
      firstName: application.firstName,
      lastName: application.lastName,
      role: 'STUDENT',
      candidateId: application.id,
    };
  }

  private readSessionUser(): User | null {
    const savedUser = this.options.storage.getItem(this.sessionStorageKey);
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser) as User;
    } catch {
      this.options.storage.removeItem(this.sessionStorageKey);
      return null;
    }
  }

  private readSavedApplications(): Application[] {
    const savedApplications = this.options.storage.getItem(this.applicationStorageKey);
    if (!savedApplications) return [];

    try {
      return JSON.parse(savedApplications) as Application[];
    } catch {
      return [];
    }
  }

  private createSession(user: User): AuthSession {
    return {
      user,
      issuedAt: new Date().toISOString(),
    };
  }

  private async delay(): Promise<void> {
    if (this.delayMs <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }
}

export function createPrototypeAuthService(): AuthService {
  if (import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend') {
    return new BackendAuthService();
  }

  return new LocalStorageAuthService({
    users: MOCK_USERS,
    storage: localStorage,
  });
}
