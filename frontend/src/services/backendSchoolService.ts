import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type PaginatedResult, type ServiceResult } from './serviceResult';

export type SchoolClassification = 'Public' | 'Private';
export type SchoolStatus = 'Active' | 'Inactive';

export interface SchoolRecord {
  id: string;
  code: string;
  classification: SchoolClassification;
  name: string;
  examineeCapacity: number;
  region: string;
  status: SchoolStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolPayload {
  classification: SchoolClassification;
  name: string;
  examineeCapacity: number;
  region: string;
  status: SchoolStatus;
}

export interface SchoolListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  classification?: SchoolClassification | '';
  region?: string;
  status?: SchoolStatus | '';
  ordering?: string;
}

/**
 * API shape returned by `/api/v1/schools/`. The serializer already emits
 * camelCase for `examineeCapacity`, so the mapping is near-identity, but we
 * keep an explicit boundary type in line with the other backend services.
 */
interface ApiSchool {
  id: number | string;
  code: string;
  classification: SchoolClassification;
  name: string;
  examineeCapacity: number;
  region: string;
  status: SchoolStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolService {
  listSchools(): Promise<ServiceResult<SchoolRecord[]>>;
  listSchoolsPage(params: SchoolListParams): Promise<ServiceResult<PaginatedResult<SchoolRecord>>>;
  createSchool(payload: SchoolPayload): Promise<ServiceResult<SchoolRecord>>;
  updateSchool(id: string, payload: SchoolPayload): Promise<ServiceResult<SchoolRecord>>;
  deleteSchool(id: string): Promise<ServiceResult<null>>;
}

const SCHOOLS_ENDPOINT = '/api/v1/schools/';

export class BackendSchoolService implements SchoolService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listSchools(): Promise<ServiceResult<SchoolRecord[]>> {
    const result = await this.apiClient.request<ApiSchool[]>(SCHOOLS_ENDPOINT);
    if (!result.ok) return result as ServiceResult<SchoolRecord[]>;
    return serviceSuccess(result.data.map((item) => this.fromApiSchool(item)));
  }

  async listSchoolsPage(params: SchoolListParams): Promise<ServiceResult<PaginatedResult<SchoolRecord>>> {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 1));
    query.set('pageSize', String(params.pageSize ?? 20));
    if (params.search) query.set('search', params.search);
    if (params.classification) query.set('classification', params.classification);
    if (params.region) query.set('region', params.region);
    if (params.status) query.set('status', params.status);
    if (params.ordering) query.set('ordering', params.ordering);
    const result = await this.apiClient.request<PaginatedResult<ApiSchool>>(
      `${SCHOOLS_ENDPOINT}?${query.toString()}`,
    );
    if (!result.ok) return result as ServiceResult<PaginatedResult<SchoolRecord>>;
    return serviceSuccess({
      ...result.data,
      results: result.data.results.map((item) => this.fromApiSchool(item)),
    });
  }

  async createSchool(payload: SchoolPayload): Promise<ServiceResult<SchoolRecord>> {
    return this.mapItem(
      await this.apiClient.request<ApiSchool>(SCHOOLS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(this.toApiPayload(payload)),
      }),
    );
  }

  async updateSchool(id: string, payload: SchoolPayload): Promise<ServiceResult<SchoolRecord>> {
    return this.mapItem(
      await this.apiClient.request<ApiSchool>(`${SCHOOLS_ENDPOINT}${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(this.toApiPayload(payload)),
      }),
    );
  }

  deleteSchool(id: string): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(`${SCHOOLS_ENDPOINT}${id}/`, { method: 'DELETE' });
  }

  private mapItem(result: ServiceResult<ApiSchool>): ServiceResult<SchoolRecord> {
    if (!result.ok) return result as ServiceResult<SchoolRecord>;
    return serviceSuccess(this.fromApiSchool(result.data));
  }

  private fromApiSchool(school: ApiSchool): SchoolRecord {
    return {
      id: String(school.id),
      code: school.code,
      classification: school.classification,
      name: school.name,
      examineeCapacity: school.examineeCapacity,
      region: school.region,
      status: school.status,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };
  }

  private toApiPayload(payload: SchoolPayload): Record<string, unknown> {
    return {
      classification: payload.classification,
      name: payload.name,
      examineeCapacity: payload.examineeCapacity,
      region: payload.region,
      status: payload.status,
    };
  }
}

/**
 * In-memory prototype implementation used when no backend is configured.
 * Starts empty and never persists to storage, matching the prototype
 * behaviour of the other Maintenance Center tables.
 */
export class MockSchoolService implements SchoolService {
  private schools: SchoolRecord[] = [];
  private sequence = 0;

  async listSchools(): Promise<ServiceResult<SchoolRecord[]>> {
    return serviceSuccess(this.schools.map((school) => ({ ...school })));
  }

  async listSchoolsPage(params: SchoolListParams): Promise<ServiceResult<PaginatedResult<SchoolRecord>>> {
    let items = this.schools.map((school) => ({ ...school }));
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (params.classification) items = items.filter((s) => s.classification === params.classification);
    if (params.region) items = items.filter((s) => s.region === params.region);
    if (params.status) items = items.filter((s) => s.status === params.status);
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
    });
  }

  async createSchool(payload: SchoolPayload): Promise<ServiceResult<SchoolRecord>> {
    this.sequence += 1;
    const now = new Date().toISOString();
    const school: SchoolRecord = {
      id: `sch-${this.sequence}`,
      code: `SCH-${String(this.sequence).padStart(5, '0')}`,
      classification: payload.classification,
      name: payload.name,
      examineeCapacity: payload.examineeCapacity,
      region: payload.region,
      status: payload.status,
      createdAt: now,
      updatedAt: now,
    };
    this.schools = [school, ...this.schools];
    return serviceSuccess({ ...school });
  }

  async updateSchool(id: string, payload: SchoolPayload): Promise<ServiceResult<SchoolRecord>> {
    let updated: SchoolRecord | null = null;
    this.schools = this.schools.map((school) => {
      if (school.id !== id) return school;
      updated = { ...school, ...payload, updatedAt: new Date().toISOString() };
      return updated;
    });
    return serviceSuccess(updated ? { ...updated } : this.schools[0]);
  }

  async deleteSchool(id: string): Promise<ServiceResult<null>> {
    this.schools = this.schools.filter((school) => school.id !== id);
    return serviceSuccess(null);
  }
}

export function createSchoolService(): SchoolService {
  if (import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend') {
    return new BackendSchoolService();
  }
  return new MockSchoolService();
}

export const schoolService = createSchoolService();
