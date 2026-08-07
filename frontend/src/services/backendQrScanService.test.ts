import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendQrScanService, MockQrScanService } from './backendQrScanService';

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

const roster = [
  { id: 'ST-001', name: 'Juan Carlos Villanueva', attendance: 'Pending' as const, qrCode: 'SAMPLE_QR_ST-001' },
  { id: 'ST-002', name: 'Maria Cristina Santos', attendance: 'Present' as const, qrCode: 'SAMPLE_QR_ST-002' },
];

describe('BackendQrScanService', () => {
  it('maps a first-valid-scan response, unwrapping the nested permit including its real schedule', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          alreadyMarked: false,
          permit: {
            candidateId: 'ST-001',
            fullName: 'Juan Carlos Villanueva',
            testCenter: 'UP Diliman',
            room: 'Melchor Hall',
            seat: 'A01',
            examDate: '2026-06-15',
            examStartTime: '08:00:00',
            examEndTime: '11:00:00',
          },
          scannedAt: '2026-08-07T01:00:00Z',
        },
        { status: 200 },
      ),
    );
    const service = new BackendQrScanService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.scan('SAMPLE_QR_ST-001', { students: [] });

    expect(result).toEqual({
      ok: true,
      data: {
        alreadyMarked: false,
        candidateId: 'ST-001',
        scannedAt: '2026-08-07T01:00:00Z',
        fullName: 'Juan Carlos Villanueva',
        testCenter: 'UP Diliman',
        room: 'Melchor Hall',
        seat: 'A01',
        examDate: '2026-06-15',
        examStartTime: '08:00:00',
        examEndTime: '11:00:00',
      },
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/attendance/scan/',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ qrToken: 'SAMPLE_QR_ST-001' }) }),
    );
  });

  it('leaves schedule fields undefined when the permit has none set', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          alreadyMarked: false,
          permit: {
            candidateId: 'ST-001',
            fullName: 'Juan Carlos Villanueva',
            testCenter: 'UP Diliman',
            room: 'Melchor Hall',
            seat: 'A01',
            examDate: null,
            examStartTime: null,
            examEndTime: null,
          },
          scannedAt: '2026-08-07T01:00:00Z',
        },
        { status: 200 },
      ),
    );
    const service = new BackendQrScanService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.scan('SAMPLE_QR_ST-001', { students: [] });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.examDate).toBeUndefined();
      expect(result.data.examStartTime).toBeUndefined();
      expect(result.data.examEndTime).toBeUndefined();
    }
  });

  it('maps an already-marked response', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          alreadyMarked: true,
          permit: { candidateId: 'ST-002', fullName: 'x', testCenter: 'x', room: 'x', seat: 'x' },
          scannedAt: '2026-08-07T01:00:00Z',
        },
        { status: 200 },
      ),
    );
    const service = new BackendQrScanService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.scan('SAMPLE_QR_ST-002', { students: [] });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.alreadyMarked).toBe(true);
  });

  it('surfaces a NOT_FOUND error with the Django-provided message', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'This QR code does not match any issued permit.' } }, { status: 404 }),
    );
    const service = new BackendQrScanService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.scan('unknown-token', { students: [] });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('NOT_FOUND');
      expect(result.error.message).toBe('This QR code does not match any issued permit.');
    }
  });

  it('surfaces a VOID error as a conflict', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'VOID', message: 'This permit has been voided and cannot be used for entry.' } }, { status: 409 }),
    );
    const service = new BackendQrScanService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.scan('voided-token', { students: [] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('CONFLICT');
  });

  it('surfaces a network failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('fetch failed'));
    const service = new BackendQrScanService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.scan('any-token', { students: [] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NETWORK');
  });
});

describe('MockQrScanService', () => {
  it('matches against the provided roster and reports alreadyMarked from attendance status', async () => {
    const service = new MockQrScanService();

    const result = await service.scan('SAMPLE_QR_ST-002', { students: roster });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.candidateId).toBe('ST-002');
      expect(result.data.alreadyMarked).toBe(true);
    }
  });

  it('reports not-found for a code matching no one on the roster', async () => {
    const service = new MockQrScanService();

    const result = await service.scan('SAMPLE_QR_UNKNOWN', { students: roster });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NOT_FOUND');
  });

  it('reports not-already-marked for a Pending student', async () => {
    const service = new MockQrScanService();

    const result = await service.scan('SAMPLE_QR_ST-001', { students: roster });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.alreadyMarked).toBe(false);
  });
});
