import type { Application, ApplicationStatus, Schedule, User } from '../types';
import type { ServiceResult } from './serviceResult';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface AuthCredentials {
  email: string;
  password?: string;
  otp?: string;
}

export interface AuthSession {
  user: User;
  issuedAt: string;
  expiresAt?: string;
}

export interface AuthIdentifierChallenge {
  pendingAuthToken?: string;
  activationToken?: string;
  nextStep: 'password' | 'activation';
  expiresInSeconds: number;
}

export interface AuthOtpChallenge {
  otpPendingAuthToken: string;
  nextStep: 'otp';
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  devOtp?: string;
}

export interface AuthSelfieChallenge {
  selfiePendingAuthToken: string;
  nextStep: 'selfie';
  expiresInSeconds: number;
}

export interface AuthService {
  getCurrentSession(): Promise<ServiceResult<AuthSession | null>>;
  login(credentials: AuthCredentials): Promise<ServiceResult<AuthSession>>;
  startLoginIdentifier?(identifier: string): Promise<ServiceResult<AuthIdentifierChallenge>>;
  verifyLoginPassword?(pendingAuthToken: string, password: string): Promise<ServiceResult<AuthOtpChallenge>>;
  completeStaffActivation?(activationToken: string, password: string, confirmPassword: string): Promise<ServiceResult<null>>;
  verifyLoginOtp?(otpPendingAuthToken: string, code: string): Promise<ServiceResult<AuthSelfieChallenge>>;
  completeLoginSelfie?(selfiePendingAuthToken: string, file: File): Promise<ServiceResult<AuthSession>>;
  logout(): Promise<ServiceResult<null>>;
  refreshSession(): Promise<ServiceResult<AuthSession>>;
}

export interface ApplicationQuery {
  search?: string;
  status?: ApplicationStatus;
  userId?: string;
  page?: number;
  pageSize?: number;
}

export type ApplicationDraftInput = Partial<Omit<Application, 'id' | 'submittedAt' | 'status'>>;

export interface SubmitApplicationInput extends ApplicationDraftInput {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ApplicationService {
  listApplications(query?: ApplicationQuery): Promise<ServiceResult<Application[], PaginationMeta>>;
  getApplicationById(id: string): Promise<ServiceResult<Application>>;
  getApplicationForUser(userId: string): Promise<ServiceResult<Application | null>>;
  saveDraft(input: ApplicationDraftInput): Promise<ServiceResult<ApplicationDraftInput>>;
  submitApplication(input: SubmitApplicationInput): Promise<ServiceResult<Application>>;
  updateApplication(id: string, updates: Partial<Application>): Promise<ServiceResult<Application>>;
}

export type ReviewerDecision = 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION';

export interface ReviewerDecisionInput {
  applicationId: string;
  reviewerId: string;
  decision: ReviewerDecision;
  reason?: string;
  requiredCorrections?: string[];
}

export interface ReviewerService {
  listReviewQueue(query?: ApplicationQuery): Promise<ServiceResult<Application[], PaginationMeta>>;
  getReviewApplication(applicationId: string): Promise<ServiceResult<Application>>;
  decideApplication(input: ReviewerDecisionInput): Promise<ServiceResult<Application>>;
  reassignTestingSchedule(applicationId: string, scheduleId: string): Promise<ServiceResult<Application>>;
  listSchedules(): Promise<ServiceResult<Schedule[]>>;
}
