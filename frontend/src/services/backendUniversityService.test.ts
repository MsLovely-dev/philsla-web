import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import {
  BackendUniversityService,
  MockUniversityService,
  type CollegeCoursePayload,
  type UniversityPayload,
} from './backendUniversityService';

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

const apiUniversity = {
  id: 1,
  code: 'UNI-00001',
  classification: 'Public' as const,
  name: 'University of the Philippines Diliman',
  region: 'NCR',
  city: 'Quezon City',
  presidentRector: 'Dr. Angelo A. Jimenez',
  email: 'info@up.edu.ph',
  phone: '(02) 8981-8500',
  establishedYear: 1908,
  status: 'Active' as const,
  createdAt: '2026-08-06T00:00:00Z',
  updatedAt: '2026-08-06T00:00:00Z',
};

const apiCourse = {
  id: 10,
  universityId: 1,
  universityCode: 'UNI-00001',
  collegeName: 'College of Engineering',
  programCode: 'BSCS',
  programName: 'Bachelor of Science in Computer Science',
  degreeType: 'Bachelor of Science' as const,
  majorSpecialization: 'Software Engineering',
  durationYears: 4,
  totalUnits: 158,
  cutoffPercentile: 92,
  status: 'Active' as const,
  createdAt: '2026-08-06T00:00:00Z',
  updatedAt: '2026-08-06T00:00:00Z',
};

const sampleCoursePayload: CollegeCoursePayload = {
  collegeName: 'College of Engineering',
  programCode: 'BSCS',
  programName: 'Bachelor of Science in Computer Science',
  degreeType: 'Bachelor of Science',
  majorSpecialization: 'Software Engineering',
  durationYears: 4,
  totalUnits: 158,
  cutoffPercentile: 92,
  status: 'Active',
};

const samplePayload: UniversityPayload = {
  classification: 'Public',
  name: 'University of the Philippines Diliman',
  region: 'NCR',
  city: 'Quezon City',
  presidentRector: 'Dr. Angelo A. Jimenez',
  email: 'info@up.edu.ph',
  phone: '(02) 8981-8500',
  establishedYear: 1908,
  status: 'Active',
};

describe('BackendUniversityService', () => {
  it('lists universities and maps the id to a string', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([apiUniversity], { status: 200 }));
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.listUniversities();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        expect.objectContaining({ id: '1', code: 'UNI-00001', region: 'NCR', establishedYear: 1908 }),
      ]);
    }
    expect(fetcher).toHaveBeenCalledWith('http://backend.test/api/v1/universities/', expect.objectContaining({}));
  });

  it('creates a university without sending a code (server-generated)', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(apiUniversity, { status: 201 }));
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.createUniversity(samplePayload);

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/universities/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          classification: 'Public',
          name: 'University of the Philippines Diliman',
          region: 'NCR',
          city: 'Quezon City',
          presidentRector: 'Dr. Angelo A. Jimenez',
          email: 'info@up.edu.ph',
          phone: '(02) 8981-8500',
          establishedYear: 1908,
          status: 'Active',
        }),
      }),
    );
  });

  it('sends a PATCH to the detail endpoint on update', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(apiUniversity, { status: 200 }));
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    await service.updateUniversity('1', samplePayload);

    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/universities/1/',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('lists courses from the nested university endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([apiCourse], { status: 200 }));
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.listCourses('1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        expect.objectContaining({ id: '10', universityId: '1', programCode: 'BSCS', cutoffPercentile: 92 }),
      ]);
    }
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/universities/1/courses/',
      expect.objectContaining({}),
    );
  });

  it('creates a course against the nested endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(apiCourse, { status: 201 }));
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    await service.createCourse('1', sampleCoursePayload);

    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/universities/1/courses/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(sampleCoursePayload) }),
    );
  });

  it('deletes a course against the nested detail endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const service = new BackendUniversityService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    await service.deleteCourse('1', '10');

    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/universities/1/courses/10/',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('MockUniversityService', () => {
  it('starts empty', async () => {
    const service = new MockUniversityService();

    const list = await service.listUniversities();

    expect(list.ok && list.data).toEqual([]);
  });

  it('generates sequential UNI codes and supports delete', async () => {
    const service = new MockUniversityService();

    const first = await service.createUniversity({ ...samplePayload, name: 'Alpha University' });
    const second = await service.createUniversity({ ...samplePayload, name: 'Beta University', classification: 'Private' });

    expect(first.ok && first.data.code).toBe('UNI-00001');
    expect(second.ok && second.data.code).toBe('UNI-00002');

    if (first.ok) {
      await service.deleteUniversity(first.data.id);
    }
    const list = await service.listUniversities();
    expect(list.ok && list.data.map((u) => u.name)).toEqual(['Beta University']);
  });

  it('scopes courses to their university and cascades on university delete', async () => {
    const service = new MockUniversityService();
    const created = await service.createUniversity(samplePayload);
    if (!created.ok) throw new Error('expected university create to succeed');
    const universityId = created.data.id;

    const course = await service.createCourse(universityId, sampleCoursePayload);
    expect(course.ok && course.data.universityCode).toBe(created.data.code);

    const courses = await service.listCourses(universityId);
    expect(courses.ok && courses.data).toHaveLength(1);

    await service.deleteUniversity(universityId);
    const afterDelete = await service.listCourses(universityId);
    expect(afterDelete.ok && afterDelete.data).toEqual([]);
  });

  it('paginates, filters, and searches listUniversitiesPage', async () => {
    const service = new MockUniversityService();
    for (let index = 0; index < 25; index += 1) {
      await service.createUniversity({
        ...samplePayload,
        name: `University ${String(index).padStart(2, '0')}`,
        classification: index % 2 === 0 ? 'Public' : 'Private',
      });
    }

    const firstPage = await service.listUniversitiesPage({ page: 1, pageSize: 20 });
    expect(firstPage.ok && firstPage.data.count).toBe(25);
    expect(firstPage.ok && firstPage.data.results).toHaveLength(20);
    expect(firstPage.ok && firstPage.data.next).not.toBeNull();

    const secondPage = await service.listUniversitiesPage({ page: 2, pageSize: 20 });
    expect(secondPage.ok && secondPage.data.results).toHaveLength(5);

    const publicOnly = await service.listUniversitiesPage({ page: 1, pageSize: 100, classification: 'Public' });
    expect(publicOnly.ok && publicOnly.data.results.every((u) => u.classification === 'Public')).toBe(true);

    const searched = await service.listUniversitiesPage({ page: 1, pageSize: 100, search: 'University 07' });
    expect(searched.ok && searched.data.count).toBe(1);
  });

  it('exports a CSV that neutralizes formula injection in free-text fields', async () => {
    const service = new MockUniversityService();
    await service.createUniversity({ ...samplePayload, name: '=cmd|/c calc' });

    const result = await service.exportUniversities({ columns: ['name'] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const text = await result.data.text();
    // A leading "=" is escaped with a single quote so spreadsheets treat it as text.
    expect(text).toContain("'=cmd|/c calc");
    expect(text).not.toMatch(/\r\n=cmd/);
  });

  it('exports only the requested columns', async () => {
    const service = new MockUniversityService();
    await service.createUniversity(samplePayload);

    const result = await service.exportUniversities({ columns: ['name'] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [header] = (await result.data.text()).split('\r\n');
    expect(header).toBe('University Name');
  });
});
