import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type ServiceResult } from './serviceResult';

export type UniversityClassification = 'Public' | 'Private';
export type RegistryStatus = 'Active' | 'Inactive';
export type DegreeType = 'Bachelor of Science' | 'Bachelor of Arts' | 'Bachelor of Fine Arts' | 'Associate';

export interface UniversityItem {
  id: string;
  code: string;
  name: string;
  classification: UniversityClassification;
  region: string;
  city: string;
  presidentRector: string;
  email: string;
  phone: string;
  establishedYear: number;
  status: RegistryStatus;
  courseCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollegeCourse {
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
  status: RegistryStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type UniversityInput = Pick<
  UniversityItem,
  | 'code'
  | 'name'
  | 'classification'
  | 'region'
  | 'city'
  | 'presidentRector'
  | 'email'
  | 'phone'
  | 'establishedYear'
  | 'status'
>;

export type CollegeCourseInput = Pick<
  CollegeCourse,
  | 'collegeName'
  | 'programCode'
  | 'programName'
  | 'degreeType'
  | 'majorSpecialization'
  | 'durationYears'
  | 'totalUnits'
  | 'cutoffPercentile'
  | 'status'
>;

export interface UniversityRegistrySummary {
  totalUniversities: number;
  publicUniversities: number;
  privateUniversities: number;
  totalDegreeCourses: number;
}

export interface PaginationMetadata {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  pageSize: number;
}

export interface UniversityPaginationMetadata extends PaginationMetadata {
  summary: UniversityRegistrySummary;
}

interface PaginatedResponse<TItem> {
  count: number;
  next: string | null;
  previous: string | null;
  results: TItem[];
}

interface UniversityPaginatedResponse extends PaginatedResponse<UniversityItem> {
  summary: UniversityRegistrySummary;
}

export const UNIVERSITY_REGISTRY_PAGE_SIZE = 10;

export class BackendUniversityService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listUniversities(page = 1): Promise<ServiceResult<UniversityItem[], UniversityPaginationMetadata>> {
    const result = await this.requestPage<UniversityPaginatedResponse>(
      '/api/v1/configuration/admin/universities/',
      page,
    );
    if (result.ok === false) return result;
    return serviceSuccess(result.data.results, {
      count: result.data.count,
      next: result.data.next,
      previous: result.data.previous,
      page,
      pageSize: UNIVERSITY_REGISTRY_PAGE_SIZE,
      summary: result.data.summary,
    });
  }

  async listCourses(universityId: string, page = 1): Promise<ServiceResult<CollegeCourse[], PaginationMetadata>> {
    const result = await this.requestPage<PaginatedResponse<CollegeCourse>>(
      `/api/v1/configuration/admin/universities/${encodeURIComponent(universityId)}/courses/`,
      page,
    );
    if (result.ok === false) return result;
    return serviceSuccess(result.data.results, {
      count: result.data.count,
      next: result.data.next,
      previous: result.data.previous,
      page,
      pageSize: UNIVERSITY_REGISTRY_PAGE_SIZE,
    });
  }

  createUniversity(input: UniversityInput): Promise<ServiceResult<UniversityItem>> {
    return this.apiClient.request<UniversityItem>('/api/v1/configuration/admin/universities/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateUniversity(id: string, input: UniversityInput, expectedVersion: number): Promise<ServiceResult<UniversityItem>> {
    return this.apiClient.request<UniversityItem>(
      `/api/v1/configuration/admin/universities/${encodeURIComponent(id)}/`,
      {
        method: 'PUT',
        body: JSON.stringify({ ...input, expectedVersion }),
      },
    );
  }

  deleteUniversity(id: string, version: number): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(
      `/api/v1/configuration/admin/universities/${encodeURIComponent(id)}/?version=${version}`,
      { method: 'DELETE' },
    );
  }

  createCourse(universityId: string, input: CollegeCourseInput): Promise<ServiceResult<CollegeCourse>> {
    return this.apiClient.request<CollegeCourse>(
      `/api/v1/configuration/admin/universities/${encodeURIComponent(universityId)}/courses/`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  updateCourse(
    universityId: string,
    courseId: string,
    input: CollegeCourseInput,
    expectedVersion: number,
  ): Promise<ServiceResult<CollegeCourse>> {
    return this.apiClient.request<CollegeCourse>(
      `/api/v1/configuration/admin/universities/${encodeURIComponent(universityId)}/courses/${encodeURIComponent(courseId)}/`,
      {
        method: 'PUT',
        body: JSON.stringify({ ...input, expectedVersion }),
      },
    );
  }

  deleteCourse(universityId: string, courseId: string, version: number): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(
      `/api/v1/configuration/admin/universities/${encodeURIComponent(universityId)}/courses/${encodeURIComponent(courseId)}/?version=${version}`,
      { method: 'DELETE' },
    );
  }

  private requestPage<TResponse extends PaginatedResponse<unknown>>(
    path: string,
    page: number,
  ): Promise<ServiceResult<TResponse>> {
    return this.apiClient.request<TResponse>(
      `${path}?page=${page}&pageSize=${UNIVERSITY_REGISTRY_PAGE_SIZE}`,
    );
  }
}

export const backendUniversityService = new BackendUniversityService();
