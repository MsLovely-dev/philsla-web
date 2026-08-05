import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendUniversityService, type UniversityInput, type UniversityItem } from './backendUniversityService';

const university: UniversityItem = {
  id: 'uni-1',
  code: 'UP-DIL',
  name: 'University of the Philippines Diliman',
  classification: 'Public',
  region: 'NCR - National Capital Region',
  city: 'Quezon City',
  presidentRector: 'University President',
  email: 'info@example.test',
  phone: '(02) 0000-0000',
  establishedYear: 1908,
  status: 'Active',
  courseCount: 0,
  version: 1,
  createdAt: '2026-08-03T00:00:00Z',
  updatedAt: '2026-08-03T00:00:00Z',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('BackendUniversityService', () => {
  it('loads only the requested university page with the 10-record page size and pagination metadata', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      const page = new URL(String(url)).searchParams.get('page');
      return jsonResponse({
        count: 21,
        next: 'http://backend.test/api/v1/configuration/admin/universities/?page=3&pageSize=10',
        previous: 'http://backend.test/api/v1/configuration/admin/universities/?page=1&pageSize=10',
        results: [{ ...university, id: `uni-${page}` }],
        summary: {
          totalUniversities: 21,
          publicUniversities: 12,
          privateUniversities: 9,
          totalDegreeCourses: 84,
        },
      });
    });
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.listUniversities(2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((item) => item.id)).toEqual(['uni-2']);
      expect(result.meta).toEqual({
        count: 21,
        next: 'http://backend.test/api/v1/configuration/admin/universities/?page=3&pageSize=10',
        previous: 'http://backend.test/api/v1/configuration/admin/universities/?page=1&pageSize=10',
        page: 2,
        pageSize: 10,
        summary: {
          totalUniversities: 21,
          publicUniversities: 12,
          privateUniversities: 9,
          totalDegreeCourses: 84,
        },
      });
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/configuration/admin/universities/?page=2&pageSize=10',
      expect.any(Object),
    );
  });

  it('loads only the requested course page with the 10-record page size', async () => {
    const fetcher = vi.fn(async () => jsonResponse({
      count: 11,
      next: null,
      previous: 'http://backend.test/api/v1/configuration/admin/universities/uni-1/courses/?page=1&pageSize=10',
      results: [],
    }));
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.listCourses(university.id, 2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        count: 11,
        next: null,
        previous: 'http://backend.test/api/v1/configuration/admin/universities/uni-1/courses/?page=1&pageSize=10',
        page: 2,
        pageSize: 10,
      });
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/configuration/admin/universities/uni-1/courses/?page=2&pageSize=10',
      expect.any(Object),
    );
  });

  it('sends the approved university update contract with its expected version', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
      jsonResponse({ ...university, city: 'Manila', version: 2 }),
    );
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));
    const input: UniversityInput = {
      code: university.code,
      name: university.name,
      classification: university.classification,
      region: university.region,
      city: 'Manila',
      presidentRector: university.presidentRector,
      email: university.email,
      phone: university.phone,
      establishedYear: university.establishedYear,
      status: university.status,
    };

    const result = await service.updateUniversity(university.id, input, university.version);

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/configuration/admin/universities/uni-1/',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ ...input, expectedVersion: 1 }),
      }),
    );
  });

  it('returns the backend validation error without leaking transport handling into the page', async () => {
    const fetcher = vi.fn(async () => jsonResponse({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'The request could not be processed.',
        fields: { code: ['This code already exists.'] },
      },
    }, 400));
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.createUniversity({
      code: university.code,
      name: university.name,
      classification: university.classification,
      region: university.region,
      city: university.city,
      presidentRector: university.presidentRector,
      email: university.email,
      phone: university.phone,
      establishedYear: university.establishedYear,
      status: university.status,
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.kind).toBe('VALIDATION');
      expect(result.error.message).toBe('This code already exists.');
      expect(result.error.fieldErrors?.code).toEqual(['This code already exists.']);
    }
  });
});
