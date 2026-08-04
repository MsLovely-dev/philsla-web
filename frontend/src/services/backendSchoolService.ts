import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type ServiceResult } from './serviceResult';
import { PHILIPPINE_SCHOOL_SEED, type SchoolSeedEntry } from '../data/philippineSchools';

export type SchoolClassification = 'Public' | 'Private';

export interface SchoolRecord {
  id: string;
  code: string;
  classification: SchoolClassification;
  name: string;
  examineeCapacity: number;
  region: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolPayload {
  classification: SchoolClassification;
  name: string;
  examineeCapacity: number;
  region: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface SchoolService {
  listSchools(): Promise<ServiceResult<SchoolRecord[]>>;
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
    };
  }
}

/**
 * In-memory prototype implementation used when no backend is configured.
 * Seeds real Philippine schools by default (pass `[]` for an empty instance)
 * and never persists to storage.
 */
export class MockSchoolService implements SchoolService {
  private schools: SchoolRecord[];
  private sequence: number;

  constructor(seed: SchoolSeedEntry[] = PHILIPPINE_SCHOOL_SEED) {
    const now = new Date().toISOString();
    this.schools = seed.map((entry, index) => ({
      id: `sch-${index + 1}`,
      code: `SCH-${String(index + 1).padStart(5, '0')}`,
      classification: entry.classification,
      name: entry.name,
      examineeCapacity: entry.examineeCapacity,
      region: entry.region,
      createdAt: now,
      updatedAt: now,
    }));
    this.sequence = this.schools.length;
  }

  async listSchools(): Promise<ServiceResult<SchoolRecord[]>> {
    return serviceSuccess(this.schools.map((school) => ({ ...school })));
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
