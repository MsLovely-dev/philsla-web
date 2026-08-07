import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type PaginatedResult, type ServiceResult } from './serviceResult';
import { toCsv } from './csvExportService';

export type UniversityClassification = 'Public' | 'Private';
export type ActivationStatus = 'Active' | 'Inactive';

// degree_type is a free string on the backend. These are common suggestions the
// UI offers in a combobox; any other value is accepted too.
export const DEGREE_TYPE_SUGGESTIONS = [
  'Bachelor of Science',
  'Bachelor of Arts',
  'Bachelor of Fine Arts',
  'Associate',
] as const;

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

export interface UniversityListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  classification?: UniversityClassification | '';
  region?: string;
  status?: ActivationStatus | '';
  ordering?: string;
}

export interface UniversitySummary {
  total: number;
  public: number;
  private: number;
  active: number;
  totalCourses: number;
}

export type UniversityPage = PaginatedResult<UniversityRecord> & { summary: UniversitySummary };

export interface UniversityExportParams {
  columns: string[];
  search?: string;
  classification?: UniversityClassification | '';
  region?: string;
  status?: ActivationStatus | '';
}

// Column set for the mock/prototype CSV export (backend owns the real one).
const MOCK_UNIVERSITY_COLUMNS: Record<string, { header: string; get: (u: UniversityRecord) => unknown }> = {
  code: { header: 'Code', get: (u) => u.code },
  name: { header: 'University Name', get: (u) => u.name },
  classification: { header: 'Classification', get: (u) => u.classification },
  region: { header: 'Region', get: (u) => u.region },
  city: { header: 'City', get: (u) => u.city },
  presidentRector: { header: 'President/Rector', get: (u) => u.presidentRector },
  email: { header: 'Email', get: (u) => u.email },
  phone: { header: 'Phone', get: (u) => u.phone },
  establishedYear: { header: 'Established', get: (u) => u.establishedYear ?? '' },
  courseCount: { header: 'Course Count', get: (u) => u.courseCount },
  status: { header: 'Status', get: (u) => u.status },
};

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
  degreeType: string;
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
  degreeType: string;
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
  degreeType: string;
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
  listUniversitiesPage(params: UniversityListParams): Promise<ServiceResult<UniversityPage>>;
  exportUniversities(params: UniversityExportParams): Promise<ServiceResult<Blob>>;
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

  async listUniversitiesPage(params: UniversityListParams): Promise<ServiceResult<UniversityPage>> {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 1));
    query.set('pageSize', String(params.pageSize ?? 20));
    if (params.search) query.set('search', params.search);
    if (params.classification) query.set('classification', params.classification);
    if (params.region) query.set('region', params.region);
    if (params.status) query.set('status', params.status);
    if (params.ordering) query.set('ordering', params.ordering);
    const result = await this.apiClient.request<PaginatedResult<ApiUniversity> & { summary: UniversitySummary }>(
      `${UNIVERSITIES_ENDPOINT}?${query.toString()}`,
    );
    if (!result.ok) return result as ServiceResult<UniversityPage>;
    return serviceSuccess({
      ...result.data,
      results: result.data.results.map((item) => this.fromApiUniversity(item)),
    });
  }

  exportUniversities(params: UniversityExportParams): Promise<ServiceResult<Blob>> {
    const query = new URLSearchParams();
    if (params.columns.length) query.set('columns', params.columns.join(','));
    if (params.search) query.set('search', params.search);
    if (params.classification) query.set('classification', params.classification);
    if (params.region) query.set('region', params.region);
    if (params.status) query.set('status', params.status);
    return this.apiClient.requestBlob(`${UNIVERSITIES_ENDPOINT}export/?${query.toString()}`);
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

  async listUniversitiesPage(params: UniversityListParams): Promise<ServiceResult<UniversityPage>> {
    let items = this.universities.map((university) => ({ ...university }));
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (u) =>
          u.code.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q),
      );
    }
    if (params.classification) items = items.filter((u) => u.classification === params.classification);
    if (params.region) items = items.filter((u) => u.region === params.region);
    if (params.status) items = items.filter((u) => u.status === params.status);
    items.sort((a, b) => a.name.localeCompare(b.name));
    if (params.ordering === '-name') items.reverse();
    const pageSize = params.pageSize ?? 20;
    const page = params.page ?? 1;
    const start = (page - 1) * pageSize;
    return serviceSuccess({
      count: items.length,
      next: start + pageSize < items.length ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: items.slice(start, start + pageSize),
      summary: {
        total: this.universities.length,
        public: this.universities.filter((u) => u.classification === 'Public').length,
        private: this.universities.filter((u) => u.classification === 'Private').length,
        active: this.universities.filter((u) => u.status === 'Active').length,
        totalCourses: this.courses.length,
      },
    });
  }

  async exportUniversities(params: UniversityExportParams): Promise<ServiceResult<Blob>> {
    let items = this.universities.map((university) => ({ ...university }));
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (u) =>
          u.code.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q),
      );
    }
    if (params.classification) items = items.filter((u) => u.classification === params.classification);
    if (params.region) items = items.filter((u) => u.region === params.region);
    if (params.status) items = items.filter((u) => u.status === params.status);
    const keys = params.columns.length
      ? params.columns.filter((k) => k in MOCK_UNIVERSITY_COLUMNS)
      : Object.keys(MOCK_UNIVERSITY_COLUMNS);
    const header = keys.map((k) => MOCK_UNIVERSITY_COLUMNS[k].header);
    const rows = items.map((u) => keys.map((k) => MOCK_UNIVERSITY_COLUMNS[k].get(u)));
    return serviceSuccess(new Blob([toCsv(header, rows)], { type: 'text/csv' }));
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
