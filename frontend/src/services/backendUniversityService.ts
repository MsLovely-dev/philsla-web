import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type ServiceResult } from './serviceResult';

export type UniversityClassification = 'Public' | 'Private';
export type ActivationStatus = 'Active' | 'Inactive';
export type DegreeType =
  | 'Bachelor of Science'
  | 'Bachelor of Arts'
  | 'Bachelor of Fine Arts'
  | 'Associate';

export interface UniversityRecord {
  id: string;
  code: string;
  classification: UniversityClassification;
  name: string;
  region: string;
  city: string;
  presidentRector: string;
  email: string;
  phone: string;
  establishedYear: number | null;
  status: ActivationStatus;
  courseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UniversityPayload {
  classification: UniversityClassification;
  name: string;
  region: string;
  city: string;
  presidentRector: string;
  email: string;
  phone: string;
  establishedYear: number | null;
  status: ActivationStatus;
}

/**
 * API shape returned by `/api/v1/universities/`. The serializer already emits
 * camelCase (`presidentRector`, `establishedYear`), so the mapping is
 * near-identity, but we keep an explicit boundary type in line with the other
 * backend services (see `backendSchoolService.ts`).
 */
interface ApiUniversity {
  id: number | string;
  code: string;
  classification: UniversityClassification;
  name: string;
  region: string;
  city: string;
  presidentRector: string;
  email: string;
  phone: string;
  establishedYear: number | null;
  status: ActivationStatus;
  courseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollegeCourseRecord {
  id: string;
  universityId: string;
  universityCode: string;
  collegeName: string;
  programCode: string;
  programName: string;
  degreeType: DegreeType;
  majorSpecialization: string;
  durationYears: number;
  totalUnits: number;
  cutoffPercentile: number;
  status: ActivationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CollegeCoursePayload {
  collegeName: string;
  programCode: string;
  programName: string;
  degreeType: DegreeType;
  majorSpecialization: string;
  durationYears: number;
  totalUnits: number;
  cutoffPercentile: number;
  status: ActivationStatus;
}

interface ApiCollegeCourse {
  id: number | string;
  universityId: number | string;
  universityCode: string;
  collegeName: string;
  programCode: string;
  programName: string;
  degreeType: DegreeType;
  majorSpecialization: string;
  durationYears: number;
  totalUnits: number;
  cutoffPercentile: number;
  status: ActivationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UniversityService {
  listUniversities(): Promise<ServiceResult<UniversityRecord[]>>;
  createUniversity(payload: UniversityPayload): Promise<ServiceResult<UniversityRecord>>;
  updateUniversity(id: string, payload: UniversityPayload): Promise<ServiceResult<UniversityRecord>>;
  deleteUniversity(id: string): Promise<ServiceResult<null>>;
  listCourses(universityId: string): Promise<ServiceResult<CollegeCourseRecord[]>>;
  createCourse(universityId: string, payload: CollegeCoursePayload): Promise<ServiceResult<CollegeCourseRecord>>;
  updateCourse(
    universityId: string,
    courseId: string,
    payload: CollegeCoursePayload,
  ): Promise<ServiceResult<CollegeCourseRecord>>;
  deleteCourse(universityId: string, courseId: string): Promise<ServiceResult<null>>;
}

const UNIVERSITIES_ENDPOINT = '/api/v1/universities/';

function coursesEndpoint(universityId: string): string {
  return `${UNIVERSITIES_ENDPOINT}${universityId}/courses/`;
}

export class BackendUniversityService implements UniversityService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listUniversities(): Promise<ServiceResult<UniversityRecord[]>> {
    const result = await this.apiClient.request<ApiUniversity[]>(UNIVERSITIES_ENDPOINT);
    if (!result.ok) return result as ServiceResult<UniversityRecord[]>;
    return serviceSuccess(result.data.map((item) => this.fromApiUniversity(item)));
  }

  async createUniversity(payload: UniversityPayload): Promise<ServiceResult<UniversityRecord>> {
    return this.mapItem(
      await this.apiClient.request<ApiUniversity>(UNIVERSITIES_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(this.toApiPayload(payload)),
      }),
    );
  }

  async updateUniversity(id: string, payload: UniversityPayload): Promise<ServiceResult<UniversityRecord>> {
    return this.mapItem(
      await this.apiClient.request<ApiUniversity>(`${UNIVERSITIES_ENDPOINT}${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(this.toApiPayload(payload)),
      }),
    );
  }

  deleteUniversity(id: string): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(`${UNIVERSITIES_ENDPOINT}${id}/`, { method: 'DELETE' });
  }

  async listCourses(universityId: string): Promise<ServiceResult<CollegeCourseRecord[]>> {
    const result = await this.apiClient.request<ApiCollegeCourse[]>(coursesEndpoint(universityId));
    if (!result.ok) return result as ServiceResult<CollegeCourseRecord[]>;
    return serviceSuccess(result.data.map((item) => this.fromApiCourse(item)));
  }

  async createCourse(
    universityId: string,
    payload: CollegeCoursePayload,
  ): Promise<ServiceResult<CollegeCourseRecord>> {
    return this.mapCourse(
      await this.apiClient.request<ApiCollegeCourse>(coursesEndpoint(universityId), {
        method: 'POST',
        body: JSON.stringify(this.toApiCoursePayload(payload)),
      }),
    );
  }

  async updateCourse(
    universityId: string,
    courseId: string,
    payload: CollegeCoursePayload,
  ): Promise<ServiceResult<CollegeCourseRecord>> {
    return this.mapCourse(
      await this.apiClient.request<ApiCollegeCourse>(`${coursesEndpoint(universityId)}${courseId}/`, {
        method: 'PATCH',
        body: JSON.stringify(this.toApiCoursePayload(payload)),
      }),
    );
  }

  deleteCourse(universityId: string, courseId: string): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(`${coursesEndpoint(universityId)}${courseId}/`, { method: 'DELETE' });
  }

  private mapItem(result: ServiceResult<ApiUniversity>): ServiceResult<UniversityRecord> {
    if (!result.ok) return result as ServiceResult<UniversityRecord>;
    return serviceSuccess(this.fromApiUniversity(result.data));
  }

  private mapCourse(result: ServiceResult<ApiCollegeCourse>): ServiceResult<CollegeCourseRecord> {
    if (!result.ok) return result as ServiceResult<CollegeCourseRecord>;
    return serviceSuccess(this.fromApiCourse(result.data));
  }

  private fromApiCourse(course: ApiCollegeCourse): CollegeCourseRecord {
    return {
      id: String(course.id),
      universityId: String(course.universityId),
      universityCode: course.universityCode,
      collegeName: course.collegeName,
      programCode: course.programCode,
      programName: course.programName,
      degreeType: course.degreeType,
      majorSpecialization: course.majorSpecialization,
      durationYears: course.durationYears,
      totalUnits: course.totalUnits,
      cutoffPercentile: course.cutoffPercentile,
      status: course.status,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }

  private toApiCoursePayload(payload: CollegeCoursePayload): Record<string, unknown> {
    return {
      collegeName: payload.collegeName,
      programCode: payload.programCode,
      programName: payload.programName,
      degreeType: payload.degreeType,
      majorSpecialization: payload.majorSpecialization,
      durationYears: payload.durationYears,
      totalUnits: payload.totalUnits,
      cutoffPercentile: payload.cutoffPercentile,
      status: payload.status,
    };
  }

  private fromApiUniversity(university: ApiUniversity): UniversityRecord {
    return {
      id: String(university.id),
      code: university.code,
      classification: university.classification,
      name: university.name,
      region: university.region,
      city: university.city,
      presidentRector: university.presidentRector,
      email: university.email,
      phone: university.phone,
      establishedYear: university.establishedYear,
      status: university.status,
      courseCount: university.courseCount ?? 0,
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,
    };
  }

  private toApiPayload(payload: UniversityPayload): Record<string, unknown> {
    return {
      classification: payload.classification,
      name: payload.name,
      region: payload.region,
      city: payload.city,
      presidentRector: payload.presidentRector,
      email: payload.email,
      phone: payload.phone,
      establishedYear: payload.establishedYear,
      status: payload.status,
    };
  }
}

/**
 * In-memory prototype implementation used when no backend is configured.
 * Starts empty and never persists to storage, matching the prototype
 * behaviour of the other Maintenance Center tables.
 */
export class MockUniversityService implements UniversityService {
  private universities: UniversityRecord[] = [];
  private courses: CollegeCourseRecord[] = [];
  private sequence = 0;
  private courseSequence = 0;

  async listUniversities(): Promise<ServiceResult<UniversityRecord[]>> {
    return serviceSuccess(this.universities.map((university) => ({ ...university })));
  }

  async createUniversity(payload: UniversityPayload): Promise<ServiceResult<UniversityRecord>> {
    this.sequence += 1;
    const now = new Date().toISOString();
    const university: UniversityRecord = {
      id: `uni-${this.sequence}`,
      code: `UNI-${String(this.sequence).padStart(5, '0')}`,
      ...payload,
      courseCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.universities = [university, ...this.universities];
    return serviceSuccess({ ...university });
  }

  async updateUniversity(id: string, payload: UniversityPayload): Promise<ServiceResult<UniversityRecord>> {
    let updated: UniversityRecord | null = null;
    this.universities = this.universities.map((university) => {
      if (university.id !== id) return university;
      updated = { ...university, ...payload, updatedAt: new Date().toISOString() };
      return updated;
    });
    return serviceSuccess(updated ? { ...updated } : this.universities[0]);
  }

  async deleteUniversity(id: string): Promise<ServiceResult<null>> {
    this.universities = this.universities.filter((university) => university.id !== id);
    this.courses = this.courses.filter((course) => course.universityId !== id);
    return serviceSuccess(null);
  }

  async listCourses(universityId: string): Promise<ServiceResult<CollegeCourseRecord[]>> {
    return serviceSuccess(
      this.courses.filter((course) => course.universityId === universityId).map((course) => ({ ...course })),
    );
  }

  async createCourse(
    universityId: string,
    payload: CollegeCoursePayload,
  ): Promise<ServiceResult<CollegeCourseRecord>> {
    this.courseSequence += 1;
    const now = new Date().toISOString();
    const university = this.universities.find((item) => item.id === universityId);
    const course: CollegeCourseRecord = {
      id: `crs-${this.courseSequence}`,
      universityId,
      universityCode: university?.code ?? '',
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    this.courses = [...this.courses, course];
    this.syncCourseCount(universityId);
    return serviceSuccess({ ...course });
  }

  async updateCourse(
    universityId: string,
    courseId: string,
    payload: CollegeCoursePayload,
  ): Promise<ServiceResult<CollegeCourseRecord>> {
    let updated: CollegeCourseRecord | null = null;
    this.courses = this.courses.map((course) => {
      if (course.id !== courseId || course.universityId !== universityId) return course;
      updated = { ...course, ...payload, updatedAt: new Date().toISOString() };
      return updated;
    });
    return serviceSuccess(updated ? { ...updated } : this.courses[0]);
  }

  async deleteCourse(universityId: string, courseId: string): Promise<ServiceResult<null>> {
    this.courses = this.courses.filter(
      (course) => !(course.id === courseId && course.universityId === universityId),
    );
    this.syncCourseCount(universityId);
    return serviceSuccess(null);
  }

  private syncCourseCount(universityId: string): void {
    const count = this.courses.filter((course) => course.universityId === universityId).length;
    this.universities = this.universities.map((university) =>
      university.id === universityId ? { ...university, courseCount: count } : university,
    );
  }
}

export function createUniversityService(): UniversityService {
  if (import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend') {
    return new BackendUniversityService();
  }
  return new MockUniversityService();
}

export const universityService = createUniversityService();
