import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type ServiceFailure, type ServiceResult } from './serviceResult';

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

interface PaginatedResponse<TItem> {
  count: number;
  next: string | null;
  previous: string | null;
  results: TItem[];
}

const PAGE_SIZE = 100;

export class BackendUniversityService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  listUniversities(): Promise<ServiceResult<UniversityItem[]>> {
    return this.listAllPages<UniversityItem>('/api/v1/configuration/admin/universities/');
  }

  listCourses(universityId: string): Promise<ServiceResult<CollegeCourse[]>> {
    return this.listAllPages<CollegeCourse>(
      `/api/v1/configuration/admin/universities/${encodeURIComponent(universityId)}/courses/`,
    );
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

  private async listAllPages<TItem>(path: string): Promise<ServiceResult<TItem[]>> {
    const firstPage = await this.apiClient.request<PaginatedResponse<TItem>>(
      `${path}?page=1&pageSize=${PAGE_SIZE}`,
    );
    if (firstPage.ok === false) return firstPage as ServiceFailure;

    const totalPages = Math.ceil(firstPage.data.count / PAGE_SIZE);
    if (totalPages <= 1) return serviceSuccess(firstPage.data.results);

    const remainingRequests = Array.from(
      { length: totalPages - 1 },
      (_, index) => this.apiClient.request<PaginatedResponse<TItem>>(
        `${path}?page=${index + 2}&pageSize=${PAGE_SIZE}`,
      ),
    );
    const remainingPages = await Promise.all(remainingRequests);
    const failedPage = remainingPages.find((page): page is ServiceFailure => page.ok === false);
    if (failedPage) return failedPage;

    return serviceSuccess([
      ...firstPage.data.results,
      ...remainingPages.flatMap((page) => page.ok ? page.data.results : []),
    ]);
  }
}

export const backendUniversityService = new BackendUniversityService();
