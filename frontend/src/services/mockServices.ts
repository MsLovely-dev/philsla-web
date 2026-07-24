import type {
  Application,
  ApplicationStatus,
  Schedule,
  User,
} from '../types';
import type {
  ApplicationDraftInput,
  ApplicationQuery,
  ApplicationService,
  AuthCredentials,
  AuthService,
  AuthSession,
  PaginationMeta,
  ReviewerDecisionInput,
  ReviewerService,
  SubmitApplicationInput,
} from './contracts';
import {
  authorizationError,
  conflictError,
  notFoundError,
  serviceSuccess,
  validationError,
} from './serviceResult';
import type { ServiceResult } from './serviceResult';

interface MockAuthServiceOptions {
  users: User[];
  applications?: Application[];
  initialSession?: AuthSession | null;
}

export class MockAuthService implements AuthService {
  private session: AuthSession | null;

  constructor(private readonly options: MockAuthServiceOptions) {
    this.session = options.initialSession ?? null;
  }

  async getCurrentSession(): Promise<ServiceResult<AuthSession | null>> {
    return serviceSuccess(this.session);
  }

  async login(credentials: AuthCredentials): Promise<ServiceResult<AuthSession>> {
    const email = credentials.email.trim().toLowerCase();

    if (!email) {
      return validationError('Email is required.', {
        email: ['Enter the email address for the prototype account.'],
      });
    }

    const user =
      this.options.users.find((item) => item.email.toLowerCase() === email) ??
      this.findStudentFromApplication(email);

    if (!user) {
      return authorizationError('No prototype account matches that email.', 'INVALID_CREDENTIALS');
    }

    this.session = {
      user,
      issuedAt: new Date().toISOString(),
    };

    return serviceSuccess(this.session);
  }

  async logout(): Promise<ServiceResult<null>> {
    this.session = null;
    return serviceSuccess(null);
  }

  async refreshSession(): Promise<ServiceResult<AuthSession>> {
    if (!this.session) {
      return authorizationError('The prototype session has expired.', 'SESSION_EXPIRED');
    }

    this.session = {
      ...this.session,
      issuedAt: new Date().toISOString(),
    };

    return serviceSuccess(this.session);
  }

  private findStudentFromApplication(email: string): User | undefined {
    const application = this.options.applications?.find(
      (item) => item.email.toLowerCase() === email,
    );

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
}

interface MockApplicationServiceOptions {
  applications: Application[];
}

export class MockApplicationService implements ApplicationService {
  private applications: Application[];

  constructor(options: MockApplicationServiceOptions) {
    this.applications = [...options.applications];
  }

  async listApplications(
    query: ApplicationQuery = {},
  ): Promise<ServiceResult<Application[], PaginationMeta>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? (this.applications.length || 1);
    const filtered = this.filterApplications(query);
    const start = (page - 1) * pageSize;

    return serviceSuccess(filtered.slice(start, start + pageSize), {
      page,
      pageSize,
      total: filtered.length,
    });
  }

  async getApplicationById(id: string): Promise<ServiceResult<Application>> {
    const application = this.applications.find((item) => item.id === id);
    return application ? serviceSuccess(application) : notFoundError('Application not found.');
  }

  async getApplicationForUser(userId: string): Promise<ServiceResult<Application | null>> {
    return serviceSuccess(this.applications.find((item) => item.userId === userId) ?? null);
  }

  async saveDraft(input: ApplicationDraftInput): Promise<ServiceResult<ApplicationDraftInput>> {
    return serviceSuccess(input);
  }

  async submitApplication(input: SubmitApplicationInput): Promise<ServiceResult<Application>> {
    const fieldErrors: Record<string, string[]> = {};

    if (!input.userId.trim()) fieldErrors.userId = ['User ID is required.'];
    if (!input.firstName.trim()) fieldErrors.firstName = ['First name is required.'];
    if (!input.lastName.trim()) fieldErrors.lastName = ['Last name is required.'];
    if (!input.email.trim()) fieldErrors.email = ['Email is required.'];

    if (Object.keys(fieldErrors).length > 0) {
      return validationError('Application cannot be submitted yet.', fieldErrors);
    }

    if (this.applications.some((item) => item.userId === input.userId)) {
      return conflictError('This user already has an application.', 'APPLICATION_ALREADY_EXISTS');
    }

    const application: Application = {
      ...this.createApplicationDefaults(input),
      ...input,
      id: `CAND-2026-${String(this.applications.length + 1).padStart(4, '0')}`,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    this.applications = [application, ...this.applications];
    return serviceSuccess(application);
  }

  async updateApplication(
    id: string,
    updates: Partial<Application>,
  ): Promise<ServiceResult<Application>> {
    const index = this.applications.findIndex((item) => item.id === id);

    if (index === -1) {
      return notFoundError('Application not found.');
    }

    const updated = { ...this.applications[index], ...updates };
    this.applications = this.applications.map((item) => (item.id === id ? updated : item));
    return serviceSuccess(updated);
  }

  private filterApplications(query: ApplicationQuery): Application[] {
    const search = query.search?.trim().toLowerCase();

    return this.applications.filter((item) => {
      const matchesStatus = query.status ? item.status === query.status : true;
      const matchesUser = query.userId ? item.userId === query.userId : true;
      const matchesSearch = search
        ? [item.id, item.firstName, item.lastName, item.email].some((value) =>
            value.toLowerCase().includes(search),
          )
        : true;

      return matchesStatus && matchesUser && matchesSearch;
    });
  }

  private createApplicationDefaults(input: SubmitApplicationInput): Application {
    return {
      id: '',
      userId: input.userId,
      status: 'PENDING',
      firstName: input.firstName,
      lastName: input.lastName,
      noMiddleName: true,
      dob: '',
      birthPlace: '',
      nationality: 'Filipino',
      gender: '',
      email: input.email,
      mobile: '',
      nationalId: '',
      region: '',
      province: '',
      city: '',
      barangay: '',
      street: '',
      zipCode: '',
      lrn: '',
      schoolName: '',
      schoolAddress: '',
      academicTrack: '',
      gradeLevel: '',
      gwa: 0,
      universities: [],
      courses: [],
      examScheduleId: '',
    };
  }
}

interface MockReviewerServiceOptions {
  applicationService: ApplicationService;
  schedules: Schedule[];
}

export class MockReviewerService implements ReviewerService {
  constructor(private readonly options: MockReviewerServiceOptions) {}

  async listReviewQueue(
    query: ApplicationQuery = {},
  ): Promise<ServiceResult<Application[], PaginationMeta>> {
    return this.options.applicationService.listApplications(query);
  }

  async getReviewApplication(applicationId: string): Promise<ServiceResult<Application>> {
    return this.options.applicationService.getApplicationById(applicationId);
  }

  async decideApplication(input: ReviewerDecisionInput): Promise<ServiceResult<Application>> {
    if (!input.reviewerId.trim()) {
      return authorizationError('Reviewer identity is required.', 'REVIEWER_REQUIRED');
    }

    if (
      (input.decision === 'REJECT' || input.decision === 'REQUEST_CORRECTION') &&
      !input.reason?.trim()
    ) {
      return validationError('A reason is required for this reviewer decision.', {
        reason: ['Enter a reason that can be shown in the audit trail or student feedback.'],
      });
    }

    const statusByDecision: Record<ReviewerDecisionInput['decision'], ApplicationStatus> = {
      APPROVE: 'ACCEPTED',
      REJECT: 'REJECTED',
      REQUEST_CORRECTION: 'FOR_CORRECTION',
    };

    return this.options.applicationService.updateApplication(input.applicationId, {
      status: statusByDecision[input.decision],
      reviewerId: input.reviewerId,
      reviewNotes: input.reason,
      requiredCorrections: input.requiredCorrections,
    });
  }

  async reassignTestingSchedule(
    applicationId: string,
    scheduleId: string,
  ): Promise<ServiceResult<Application>> {
    const schedule = this.options.schedules.find((item) => item.id === scheduleId);

    if (!schedule) {
      return validationError('Selected schedule is not available.', {
        scheduleId: ['Choose an available mock schedule.'],
      });
    }

    return this.options.applicationService.updateApplication(applicationId, {
      examScheduleId: schedule.id,
      examDate: schedule.date,
      examRoom: schedule.room,
      examTestCenter: schedule.testCenter,
      examStatus: 'SCHEDULED',
    });
  }

  async listSchedules(): Promise<ServiceResult<Schedule[]>> {
    return serviceSuccess(this.options.schedules);
  }
}
