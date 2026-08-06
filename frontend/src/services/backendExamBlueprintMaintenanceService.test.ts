import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendExamBlueprintMaintenanceService } from './backendExamBlueprintMaintenanceService';

function buildClient() {
  const fetcher = vi.fn();
  const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
  return { client, fetcher };
}

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json' } });
}

describe('BackendExamBlueprintMaintenanceService', () => {
  it('lists subjects and maps camelCase fields', async () => {
    const { client, fetcher } = buildClient();
    fetcher.mockResolvedValueOnce(
      jsonResponse([{ id: 1, code: 'SCI', name: 'Science', description: '', isActive: true, createdAt: '2026-08-06T00:00:00Z', updatedAt: '2026-08-06T00:00:00Z' }]),
    );
    const service = new BackendExamBlueprintMaintenanceService(client);

    const result = await service.listSubjects();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        { id: '1', code: 'SCI', name: 'Science', description: '', isActive: true, createdAt: '2026-08-06T00:00:00Z', updatedAt: '2026-08-06T00:00:00Z' },
      ]);
    }
  });

  it('creates a topic with the subjectId mapped to subject_id', async () => {
    const { client, fetcher } = buildClient();
    fetcher.mockResolvedValueOnce(
      jsonResponse(
        { id: 1, subjectId: 1, subjectCode: 'SCI', subjectName: 'Science', code: 'ORBIT', name: 'Orbital Mechanics', description: '', isActive: true, createdAt: '2026-08-06T00:00:00Z', updatedAt: '2026-08-06T00:00:00Z' },
        { status: 201 },
      ),
    );
    const service = new BackendExamBlueprintMaintenanceService(client);

    const result = await service.createTopic({ subjectId: '1', code: 'ORBIT', name: 'Orbital Mechanics', description: '' });

    expect(result.ok).toBe(true);
    const [, requestInit] = fetcher.mock.calls[0];
    expect(JSON.parse(requestInit.body as string)).toEqual({ subject_id: '1', code: 'ORBIT', name: 'Orbital Mechanics', description: '' });
  });
});
