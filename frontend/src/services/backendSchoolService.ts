import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type PaginatedResult, type ServiceResult } from './serviceResult';
import type { ImportRow, ImportSummary } from './importTypes';
import { toCsv } from './csvExportService';

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

export interface SchoolSummary {
  total: number;
  public: number;
  private: number;
  active: number;
  totalCapacity: number;
}

export type SchoolPage = PaginatedResult<SchoolRecord> & { summary: SchoolSummary };

export interface SchoolExportParams {
  columns: string[];
  search?: string;
  classification?: SchoolClassification | '';
  region?: string;
  status?: SchoolStatus | '';
}

// Column set for the mock/prototype CSV export (backend owns the real one).
const MOCK_SCHOOL_COLUMNS: Record<string, { header: string; get: (s: SchoolRecord) => unknown }> = {
  code: { header: 'Code', get: (s) => s.code },
  classification: { header: 'Classification', get: (s) => s.classification },
  name: { header: 'Name', get: (s) => s.name },
  examineeCapacity: { header: 'Examinee Capacity', get: (s) => s.examineeCapacity },
  region: { header: 'Region/Municipality/City', get: (s) => s.region },
  status: { header: 'Status', get: (s) => s.status },
};

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
  listSchoolsPage(params: SchoolListParams): Promise<ServiceResult<SchoolPage>>;
  exportSchools(params: SchoolExportParams): Promise<ServiceResult<Blob>>;
  importSchools(rows: ImportRow[]): Promise<ServiceResult<ImportSummary>>;
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

  async listSchoolsPage(params: SchoolListParams): Promise<ServiceResult<SchoolPage>> {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 1));
    query.set('pageSize', String(params.pageSize ?? 20));
    if (params.search) query.set('search', params.search);
    if (params.classification) query.set('classification', params.classification);
    if (params.region) query.set('region', params.region);
    if (params.status) query.set('status', params.status);
    if (params.ordering) query.set('ordering', params.ordering);
    const result = await this.apiClient.request<PaginatedResult<ApiSchool> & { summary: SchoolSummary }>(
      `${SCHOOLS_ENDPOINT}?${query.toString()}`,
    );
    if (!result.ok) return result as ServiceResult<SchoolPage>;
    return serviceSuccess({
      ...result.data,
      results: result.data.results.map((item) => this.fromApiSchool(item)),
    });
  }

  exportSchools(params: SchoolExportParams): Promise<ServiceResult<Blob>> {
    const query = new URLSearchParams();
    if (params.columns.length) query.set('columns', params.columns.join(','));
    if (params.search) query.set('search', params.search);
    if (params.classification) query.set('classification', params.classification);
    if (params.region) query.set('region', params.region);
    if (params.status) query.set('status', params.status);
    return this.apiClient.requestBlob(`${SCHOOLS_ENDPOINT}export/?${query.toString()}`);
  }

  importSchools(rows: ImportRow[]): Promise<ServiceResult<ImportSummary>> {
    return this.apiClient.request<ImportSummary>(`${SCHOOLS_ENDPOINT}import/`, {
      method: 'POST',
      body: JSON.stringify({ rows }),
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

  async listSchoolsPage(params: SchoolListParams): Promise<ServiceResult<SchoolPage>> {
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
      summary: {
        total: this.schools.length,
        public: this.schools.filter((s) => s.classification === 'Public').length,
        private: this.schools.filter((s) => s.classification === 'Private').length,
        active: this.schools.filter((s) => s.status === 'Active').length,
        totalCapacity: this.schools.reduce((sum, s) => sum + s.examineeCapacity, 0),
      },
    });
  }

  async exportSchools(params: SchoolExportParams): Promise<ServiceResult<Blob>> {
    let items = this.schools.map((school) => ({ ...school }));
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (params.classification) items = items.filter((s) => s.classification === params.classification);
    if (params.region) items = items.filter((s) => s.region === params.region);
    if (params.status) items = items.filter((s) => s.status === params.status);
    const keys = params.columns.length
      ? params.columns.filter((k) => k in MOCK_SCHOOL_COLUMNS)
      : Object.keys(MOCK_SCHOOL_COLUMNS);
    const header = keys.map((k) => MOCK_SCHOOL_COLUMNS[k].header);
    const rows = items.map((s) => keys.map((k) => MOCK_SCHOOL_COLUMNS[k].get(s)));
    return serviceSuccess(new Blob([toCsv(header, rows)], { type: 'text/csv' }));
  }

  async importSchools(rows: ImportRow[]): Promise<ServiceResult<ImportSummary>> {
    // Prototype mode has no backend authority; create each row best-effort.
    for (const row of rows) {
      await this.createSchool({
        classification: (row.classification as SchoolClassification) || 'Public',
        name: row.name ?? '',
        examineeCapacity: Number(row.examineeCapacity ?? 0),
        region: row.region ?? '',
        status: (row.status as SchoolStatus) || 'Active',
      });
    }
    return serviceSuccess({ created: rows.length });
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
