import type { Application } from '../types';
import { sharedApiClient, type ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export interface LrnVerificationProfile {
  lrn: string;
  firstName: string;
  middleName: string;
  lastName: string;
  extensionName: string;
  sex: string;
  dateOfBirth: string;
  schoolId: string;
  schoolName: string;
  gradeLevel: string;
  enrollmentStatus: string;
  schoolYear: string;
  identityVerified: boolean;
}

export interface LrnVerificationResult {
  verificationToken: string;
  expiresInSeconds: number;
  profile: LrnVerificationProfile;
  step2: Step2Configuration;
}

export interface Step2Configuration {
  configurationId: number | null;
  requireStudentIdVerification: boolean;
  requireStudentIdFront: boolean;
  requireStudentIdBack: boolean;
  enableStudentIdInformationExtraction: boolean;
  compareStudentName: boolean;
  compareSchoolName: boolean;
  nameMatchThreshold: number;
  schoolMatchThreshold: number;
  enableFacialComparison: boolean;
  facialReferenceMediaType: 'STUDENT_ID_FRONT';
  facialSimilarityThreshold: number;
  allowManualReview: boolean;
  maximumVerificationAttempts: number;
  effectiveDate: string | null;
}

export interface Step2ConfigurationInput extends Omit<Step2Configuration, 'configurationId' | 'effectiveDate'> {
  effectiveDate: string;
  status: boolean;
}

export interface StudentRegistrationFieldConfig {
  id: number | string;
  module?: string;
  section: string;
  type: string;
  value: string;
  fieldSection?: string;
  inputType?: 'text' | 'date' | 'dropdown' | string;
  optionValues?: string[];
  priority?: 'High Priority' | 'Medium Priority' | 'Low Priority' | string;
  remarks?: string;
  status: boolean | 'Active' | 'Inactive';
  display_order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type StudentRegistrationFieldInput = Omit<StudentRegistrationFieldConfig, 'id' | 'createdAt' | 'updatedAt'>;

export interface Step2VerificationResult {
  id: string;
  status: 'IN_PROGRESS' | 'PASSED' | 'MANUAL_REVIEW' | 'REJECTED';
  attempts: number;
  configuration: Step2Configuration;
  uploadedMedia: Array<'STUDENT_ID_FRONT' | 'STUDENT_ID_BACK' | 'SELFIE'>;
  results: Record<string, unknown>;
}

export interface RegistrationSelfieFaceValidationResult {
  faceDetected: boolean;
  faceCount: number;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface BackendApplication {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'FOR_CORRECTION' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED';
  personal: Record<string, unknown>;
  address: Record<string, unknown>;
  school: Record<string, unknown>;
  coursePreferences: Record<string, unknown>[];
  reviewStep: Record<string, unknown>;
  lrnProfile?: Record<string, unknown>;
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

  verifyLrn(
    lrn: string,
    verification?: { category: string; value: string },
  ): Promise<ServiceResult<LrnVerificationResult>> {
    return this.apiClient.request<LrnVerificationResult>('/api/v1/applications/registration/lrn/verify/', {
      method: 'POST',
      body: JSON.stringify({
        lrn,
        ...(verification ? {
          verificationCategory: verification.category,
          verificationValue: verification.value,
        } : {}),
      }),
    });
  }

  async createDraft(input: BackendApplicationDraftInput): Promise<ServiceResult<BackendApplication>> {
    return this.apiClient.request<BackendApplication>('/api/v1/applications/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async uploadStep2Media(
    registrationToken: string,
    mediaType: 'STUDENT_ID_FRONT' | 'STUDENT_ID_BACK',
    file: File,
  ): Promise<ServiceResult<Step2VerificationResult>> {
    const body = new FormData();
    body.append('mediaType', mediaType);
    body.append('file', file);
    return this.apiClient.request<Step2VerificationResult>('/api/v1/applications/registration/step-2/', {
      method: 'POST',
      headers: { 'X-Registration-Token': registrationToken },
      body,
    });
  }

  async uploadRegistrationSelfie(
    registrationToken: string,
    file: File,
  ): Promise<ServiceResult<Step2VerificationResult>> {
    const body = new FormData();
    body.append('file', file);
    return this.apiClient.request<Step2VerificationResult>('/api/v1/applications/registration/identity/selfie/', {
      method: 'POST',
      headers: { 'X-Registration-Token': registrationToken },
      body,
    });
  }

  async validateRegistrationSelfieFace(
    registrationToken: string,
    file: File,
  ): Promise<ServiceResult<RegistrationSelfieFaceValidationResult>> {
    const body = new FormData();
    body.append('file', file);
    return this.apiClient.request<RegistrationSelfieFaceValidationResult>('/api/v1/applications/registration/identity/selfie-face/', {
      method: 'POST',
      headers: { 'X-Registration-Token': registrationToken },
      body,
    });
  }

  async listStep2Configurations(): Promise<ServiceResult<Array<Step2Configuration & { id: number; status: boolean }>>> {
    return this.apiClient.request<Array<Step2Configuration & { id: number; status: boolean }>>('/api/v1/applications/configuration/step-2/');
  }

  async createStep2Configuration(input: Step2ConfigurationInput): Promise<ServiceResult<Step2Configuration>> {
    return this.apiClient.request<Step2Configuration>('/api/v1/applications/configuration/step-2/', {
      method: 'POST', body: JSON.stringify(input),
    });
  }

  async listPublicStudentRegistrationFields(): Promise<ServiceResult<StudentRegistrationFieldConfig[]>> {
    return this.apiClient.request<StudentRegistrationFieldConfig[]>('/api/v1/configuration/fields/?module=student_registration');
  }

  async listStudentRegistrationFields(): Promise<ServiceResult<StudentRegistrationFieldConfig[]>> {
    return this.apiClient.request<StudentRegistrationFieldConfig[]>('/api/v1/configuration/admin/fields/?module=student_registration');
  }

  async createStudentRegistrationField(input: StudentRegistrationFieldInput): Promise<ServiceResult<StudentRegistrationFieldConfig>> {
    return this.apiClient.request<StudentRegistrationFieldConfig>('/api/v1/configuration/admin/fields/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateStudentRegistrationField(id: number | string, input: Partial<StudentRegistrationFieldInput>): Promise<ServiceResult<StudentRegistrationFieldConfig>> {
    return this.apiClient.request<StudentRegistrationFieldConfig>(`/api/v1/configuration/admin/fields/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async deleteStudentRegistrationField(id: number | string): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(`/api/v1/configuration/admin/fields/${id}/`, {
      method: 'DELETE',
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

  async getApplication(applicationId: string): Promise<ServiceResult<BackendApplication>> {
    return this.apiClient.request<BackendApplication>(`/api/v1/applications/${applicationId}/`);
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
    gender: string;
    region: string;
    province: string;
    city: string;
    barangay: string;
    street: string;
    zipCode: string;
    lrn: string;
    schoolName: string;
    schoolId: string;
    schoolAddress: string;
    academicTrack: string;
    gradeLevel: string;
    enrollmentStatus: string;
    schoolYear: string;
    gwa: string;
    universities: string[];
    courses: string[];
    customStep1Fields?: Record<string, string>;
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
      sex: formData.gender,
      email: formData.email,
      mobile: formData.mobile,
      additionalHighPriorityFields: formData.customStep1Fields ?? {},
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
      schoolId: formData.schoolId,
      name: formData.schoolName,
      address: formData.schoolAddress,
      academicTrack: formData.academicTrack,
      gradeLevel: formData.gradeLevel,
      enrollmentStatus: formData.enrollmentStatus,
      schoolYear: formData.schoolYear,
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
  const lrnProfile = application.lrnProfile ?? {};

  return {
    id: application.id,
    userId,
    status: application.status === 'SUBMITTED' || application.status === 'RESUBMITTED' ? 'PENDING' : application.status === 'APPROVED' ? 'ACCEPTED' : application.status === 'FOR_CORRECTION' ? 'FOR_CORRECTION' : 'REJECTED',
    submittedAt: application.submittedAt ?? undefined,
    firstName: String(lrnProfile.firstName ?? personal.firstName ?? ''),
    middleName: String(lrnProfile.middleName ?? personal.middleName ?? ''),
    noMiddleName: !(lrnProfile.middleName ?? personal.middleName),
    lastName: String(lrnProfile.lastName ?? personal.lastName ?? ''),
    suffix: String(lrnProfile.extensionName ?? personal.suffix ?? ''),
    dob: String(lrnProfile.dateOfBirth ?? personal.dateOfBirth ?? ''),
    photoUrl: String(personal.studentIdPhotoUrl ?? ''),
    birthPlace: '',
    nationality: 'Filipino',
    gender: String(lrnProfile.sex ?? personal.sex ?? ''),
    email: String(personal.email ?? ''),
    mobile: String(personal.mobile ?? ''),
    nationalId: '',
    region: String(address.region ?? ''),
    province: String(address.province ?? ''),
    city: String(address.city ?? ''),
    barangay: String(address.barangay ?? ''),
    street: String(address.street ?? ''),
    zipCode: String(address.postalCode ?? ''),
    lrn: String(lrnProfile.lrn ?? school.lrn ?? ''),
    schoolName: String(lrnProfile.schoolName ?? school.name ?? ''),
    schoolAddress: String(school.address ?? ''),
    academicTrack: String(school.academicTrack ?? ''),
    gradeLevel: String(lrnProfile.gradeLevel ?? school.gradeLevel ?? ''),
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
  seat: string;
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
      seat: '',
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
