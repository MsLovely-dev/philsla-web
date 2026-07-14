import type { Application } from '../types';
import { sharedApiClient, type ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export interface LrnVerificationProfile {
  lrn: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  schoolName: string;
  gradeLevel: string;
}

export interface LrnVerificationResult {
  verificationToken: string;
  expiresInSeconds: number;
  profile: LrnVerificationProfile;
}

export interface BackendApplication {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'FOR_CORRECTION' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED';
  personal: Record<string, unknown>;
  address: Record<string, unknown>;
  school: Record<string, unknown>;
  coursePreferences: Record<string, unknown>[];
  reviewStep: Record<string, unknown>;
  examCycleId: string;
  version: number;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendApplicationDraftInput {
  verificationToken: string;
  submitOnCreate?: boolean;
  password?: string;
  personal: Record<string, unknown>;
  address: Record<string, unknown>;
  school: Record<string, unknown>;
  coursePreferences: Record<string, unknown>[];
  reviewStep: Record<string, unknown>;
}

export type BackendReviewerDecision = 'APPROVE' | 'REQUEST_CORRECTION' | 'REJECT';

export class BackendApplicationService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  verifyLrn(lrn: string, dateOfBirth: string): Promise<ServiceResult<LrnVerificationResult>> {
    return this.apiClient.request<LrnVerificationResult>('/api/v1/applications/registration/lrn/verify/', {
      method: 'POST',
      body: JSON.stringify({ lrn, dateOfBirth }),
    });
  }

  async createDraft(input: BackendApplicationDraftInput): Promise<ServiceResult<BackendApplication>> {
    return this.apiClient.request<BackendApplication>('/api/v1/applications/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async submit(applicationId: string, version: number): Promise<ServiceResult<BackendApplication>> {
    return this.apiClient.request<BackendApplication>(`/api/v1/applications/${applicationId}/submit/`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
  }

  async createAndSubmit(input: BackendApplicationDraftInput): Promise<ServiceResult<BackendApplication>> {
    return this.createDraft({ ...input, submitOnCreate: true });
  }

  async listReviewQueue(): Promise<ServiceResult<BackendApplication[]>> {
    return this.apiClient.request<BackendApplication[]>('/api/v1/applications/review-queue/');
  }

  async decideApplication(
    applicationId: string,
    decision: BackendReviewerDecision,
    input: { reason?: string; requiredCorrections?: string[] } = {},
  ): Promise<ServiceResult<BackendApplication>> {
    return this.apiClient.request<BackendApplication>(`/api/v1/applications/${applicationId}/review-decision/`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        reason: input.reason ?? '',
        requiredCorrections: input.requiredCorrections ?? [],
      }),
    });
  }
}

export function createBackendApplicationDraftInput(
  verificationToken: string,
  formData: {
    firstName: string;
    middleName: string;
    noMiddleName: boolean;
    lastName: string;
    suffix: string;
    dob: string;
    email: string;
    password: string;
    mobile: string;
    region: string;
    province: string;
    city: string;
    barangay: string;
    street: string;
    zipCode: string;
    lrn: string;
    schoolName: string;
    schoolAddress: string;
    academicTrack: string;
    gradeLevel: string;
    gwa: string;
    universities: string[];
    courses: string[];
    photoUrl: string;
    selfieUrl: string;
  },
): BackendApplicationDraftInput {
  return {
    verificationToken,
    password: formData.password,
    personal: {
      firstName: formData.firstName,
      middleName: formData.noMiddleName ? '' : formData.middleName,
      lastName: formData.lastName,
      suffix: formData.suffix,
      dateOfBirth: formData.dob,
      email: formData.email,
      mobile: formData.mobile,
      studentIdPhotoUrl: formData.photoUrl,
      selfiePhotoUrl: formData.selfieUrl,
    },
    address: {
      region: formData.region,
      province: formData.province,
      city: formData.city,
      barangay: formData.barangay,
      street: formData.street,
      postalCode: formData.zipCode,
    },
    school: {
      lrn: formData.lrn,
      name: formData.schoolName,
      address: formData.schoolAddress,
      academicTrack: formData.academicTrack,
      gradeLevel: formData.gradeLevel,
      gwa: formData.gwa,
    },
    coursePreferences: formData.universities.map((university, index) => ({
      rank: index + 1,
      university,
      course: formData.courses[index] ?? '',
    })),
    reviewStep: {
      privacyConsent: true,
      declarationAccepted: true,
    },
  };
}

export function mapBackendApplicationToFrontend(application: BackendApplication, userId: string): Application {
  const personal = application.personal;
  const address = application.address;
  const school = application.school;
  const preferences = application.coursePreferences;

  return {
    id: application.id,
    userId,
    status: application.status === 'SUBMITTED' || application.status === 'RESUBMITTED' ? 'PENDING' : application.status === 'APPROVED' ? 'ACCEPTED' : application.status === 'FOR_CORRECTION' ? 'FOR_CORRECTION' : 'REJECTED',
    submittedAt: application.submittedAt ?? undefined,
    firstName: String(personal.firstName ?? ''),
    middleName: String(personal.middleName ?? ''),
    noMiddleName: !personal.middleName,
    lastName: String(personal.lastName ?? ''),
    suffix: String(personal.suffix ?? ''),
    dob: String(personal.dateOfBirth ?? ''),
    photoUrl: String(personal.studentIdPhotoUrl ?? ''),
    birthPlace: '',
    nationality: 'Filipino',
    gender: '',
    email: String(personal.email ?? ''),
    mobile: String(personal.mobile ?? ''),
    nationalId: '',
    region: String(address.region ?? ''),
    province: String(address.province ?? ''),
    city: String(address.city ?? ''),
    barangay: String(address.barangay ?? ''),
    street: String(address.street ?? ''),
    zipCode: String(address.postalCode ?? ''),
    lrn: String(school.lrn ?? ''),
    schoolName: String(school.name ?? ''),
    schoolAddress: String(school.address ?? ''),
    academicTrack: String(school.academicTrack ?? ''),
    gradeLevel: String(school.gradeLevel ?? ''),
    gwa: Number(school.gwa ?? 0),
    universities: preferences.map((preference) => String(preference.university ?? '')),
    courses: preferences.map((preference) => String(preference.course ?? '')),
    examScheduleId: '',
  };
}

export function mapBackendApplicationsToReviewRows(applications: BackendApplication[]): Array<Application & {
  risk: string;
  duplicateScore: number;
  duplicateStatus: string;
  center: string;
  seat?: string;
  history: Array<{ status: string; date: string; actor: string }>;
}> {
  return applications.map((application) => {
    const mapped = mapBackendApplicationToFrontend(application, application.id);
    const firstPreference = application.coursePreferences[0];
    const submittedAt = application.submittedAt ?? application.createdAt;

    return {
      ...mapped,
      risk: 'LOW',
      duplicateScore: 0,
      duplicateStatus: 'No Match',
      center: String(firstPreference?.university ?? mapped.universities[0] ?? 'Not Assigned'),
      seat: undefined,
      history: [
        {
          status: application.status,
          date: submittedAt ? new Date(submittedAt).toLocaleString() : 'Pending timestamp',
          actor: 'System',
        },
      ],
    };
  });
}

export const backendApplicationService = new BackendApplicationService();
