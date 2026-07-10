import type { Application, User } from '../types';
import { MOCK_USERS } from '../lib/utils';
import type { AuthCredentials, AuthService, AuthSession } from './contracts';
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
  return new LocalStorageAuthService({
    users: MOCK_USERS,
    storage: localStorage,
  });
}
