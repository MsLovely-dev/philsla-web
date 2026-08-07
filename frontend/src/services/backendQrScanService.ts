import { sharedApiClient, type ApiClient } from './apiClient';
import { notFoundError, serviceSuccess, type ServiceResult } from './serviceResult';
import { matchScannedCodeToStudent, type ScannableStudent } from './qrAttendanceService';

export interface QrScanResult {
  alreadyMarked: boolean;
  candidateId: string;
  scannedAt: string; // ISO
  /** The candidate's real assigned exam center/room/seat/schedule, from their actual
   * ExamPermit -- undefined in mock mode, where there is no real permit to read this from
   * (callers fall back to the room/schedule they already have locally in that case). */
  fullName?: string;
  testCenter?: string;
  room?: string;
  seat?: string;
  examDate?: string; // 'YYYY-MM-DD'
  examStartTime?: string; // 'HH:MM:SS'
  examEndTime?: string; // 'HH:MM:SS'
}

/** Only `MockQrScanService` reads this -- `BackendQrScanService` ignores it, since the
 * real endpoint resolves the candidate from the QR token itself, not from a client-side roster. */
export interface QrScanMockContext {
  students: ScannableStudent[];
}

export interface QrScanService {
  scan(qrToken: string, mockContext: QrScanMockContext): Promise<ServiceResult<QrScanResult>>;
}

interface ApiScanPermit {
  candidateId: string;
  fullName: string;
  testCenter: string;
  room: string;
  seat: string;
  examDate: string | null;
  examStartTime: string | null;
  examEndTime: string | null;
}

interface ApiScanResponse {
  alreadyMarked: boolean;
  permit: ApiScanPermit;
  scannedAt: string;
}

const SCAN_ENDPOINT = '/api/v1/attendance/scan/';

export class BackendQrScanService implements QrScanService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async scan(qrToken: string): Promise<ServiceResult<QrScanResult>> {
    const result = await this.apiClient.request<ApiScanResponse>(SCAN_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
    if (!result.ok) return result;
    const { permit } = result.data;
    return serviceSuccess({
      alreadyMarked: result.data.alreadyMarked,
      candidateId: permit.candidateId,
      scannedAt: result.data.scannedAt,
      fullName: permit.fullName,
      testCenter: permit.testCenter,
      room: permit.room,
      seat: permit.seat,
      examDate: permit.examDate ?? undefined,
      examStartTime: permit.examStartTime ?? undefined,
      examEndTime: permit.examEndTime ?? undefined,
    });
  }
}

/**
 * Wraps today's `matchScannedCodeToStudent` unchanged -- this is what runs in
 * `'prototype'` mode. Behavior (including "not found" and "already marked"
 * semantics) is identical to the pre-backend-wiring page.
 */
export class MockQrScanService implements QrScanService {
  async scan(qrToken: string, mockContext: QrScanMockContext): Promise<ServiceResult<QrScanResult>> {
    const matched = matchScannedCodeToStudent(qrToken, mockContext.students);
    if (!matched) {
      return notFoundError('QR not recognized for this room.', 'NOT_FOUND');
    }
    return serviceSuccess({
      alreadyMarked: matched.attendance !== 'Pending',
      candidateId: matched.id,
      // `Date.now()`, not a bare `new Date()` -- callers (and this codebase's tests) mock the
      // clock via `vi.spyOn(Date, 'now')`, which a no-arg `new Date()` does not respect.
      scannedAt: new Date(Date.now()).toISOString(),
    });
  }
}

export function createQrScanService(): QrScanService {
  if (import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend') {
    return new BackendQrScanService();
  }
  return new MockQrScanService();
}

export const qrScanService = createQrScanService();
