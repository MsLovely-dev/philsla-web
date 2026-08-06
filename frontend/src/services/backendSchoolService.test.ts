import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendSchoolService, MockSchoolService } from './backendSchoolService';

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

const apiSchool = {
  id: 1,
  code: 'SCH-00001',
  classification: 'Public' as const,
  name: 'Philippine Science High School',
  examineeCapacity: 1200,
  region: 'NCR',
  status: 'Active' as const,
  createdAt: '2026-08-04T00:00:00Z',
  updatedAt: '2026-08-04T00:00:00Z',
};

describe('BackendSchoolService', () => {
  it('lists schools and maps the id to a string', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([apiSchool], { status: 200 }));
    const service = new BackendSchoolService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.listSchools();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        expect.objectContaining({ id: '1', code: 'SCH-00001', examineeCapacity: 1200, region: 'NCR' }),
      ]);
    }
    expect(fetcher).toHaveBeenCalledWith('http://backend.test/api/v1/schools/', expect.objectContaining({}));
  });

  it('creates a school without sending a code (server-generated)', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(apiSchool, { status: 201 }));
    const service = new BackendSchoolService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.createSchool({
      classification: 'Public',
      name: 'Philippine Science High School',
      examineeCapacity: 1200,
      region: 'NCR',
      status: 'Active',
    });

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/schools/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          classification: 'Public',
          name: 'Philippine Science High School',
          examineeCapacity: 1200,
          region: 'NCR',
          status: 'Active',
        }),
      }),
    );
  });
});

describe('MockSchoolService', () => {
  it('starts empty', async () => {
    const service = new MockSchoolService();

    const list = await service.listSchools();

    expect(list.ok && list.data).toEqual([]);
  });

  it('generates sequential SCH codes and supports delete', async () => {
    const service = new MockSchoolService();

    const first = await service.createSchool({ classification: 'Public', name: 'Alpha', examineeCapacity: 500, region: 'NCR', status: 'Active' });
    const second = await service.createSchool({ classification: 'Private', name: 'Beta', examineeCapacity: 300, region: 'Region III', status: 'Active' });

    expect(first.ok && first.data.code).toBe('SCH-00001');
    expect(second.ok && second.data.code).toBe('SCH-00002');

    if (first.ok) {
      await service.deleteSchool(first.data.id);
    }
    const list = await service.listSchools();
    expect(list.ok && list.data.map((s) => s.name)).toEqual(['Beta']);
  });
});
