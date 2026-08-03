import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sharedApiClient } from './apiClient';
import {
  getScoreManagementBatchResults,
  getScoreManagementBatchResultPage,
  getScoreManagementBatches,
  processScoreManagementBatch,
  exportScoreManagementBatch,
  releaseScoreManagementBatch,
  reprocessScoreManagementBatch,
} from './scoreManagementService';

vi.mock('./apiClient', () => ({
  sharedApiClient: {
    request: vi.fn(),
    requestBlob: vi.fn(),
  },
}));

const requestMock = vi.mocked(sharedApiClient.request);
const requestBlobMock = vi.mocked(sharedApiClient.requestBlob);

describe('scoreManagementService', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestBlobMock.mockReset();
  });

  it('fetches score batches from the backend database API', async () => {
    requestMock.mockResolvedValueOnce({
      ok: true,
      data: {
        count: 1,
        results: [
          {
            id: 'SESSION-2027-REGULAR',
            name: 'PhilSA Regular Examination 2027',
            status: 'READY_FOR_PROCESSING',
            isClosed: true,
            totalCandidates: 500,
            approvedScores: 471,
            excludedScores: 29,
          },
        ],
      },
    });

    const batches = await getScoreManagementBatches();

    expect(requestMock).toHaveBeenCalledWith('/api/v1/results/score-management/batches/');
    expect(batches[0]).toMatchObject({
      id: 'SESSION-2027-REGULAR',
      label: 'PhilSA Regular Examination 2027',
      totalCandidates: 500,
    });
  });

  it('maps processed backend score rows to the page result shape', async () => {
    requestMock.mockResolvedValueOnce({
      ok: true,
      data: {
        count: 1,
        page: 1,
        pageSize: 100,
        results: [
          {
            id: 'SCORE-PHL-2027-000001',
            candidateId: 'PHL-2027-000001',
            lrn: '109000000001',
            candidateName: 'Alon Reyes',
            sessionId: 'SESSION-2027-REGULAR',
            rankingPopulationId: 'POP-REGULAR-2027',
            examSetId: 'ES-BP0001',
            rawScore: 193,
            maxScore: 200,
            finalScore: 96.5,
            overallRank: 1,
            percentile: 99.1234,
            releaseStatus: 'NOT_RELEASED',
            processingBatchId: 'SCORE-PROC-ABC',
          },
        ],
      },
    });

    const results = await getScoreManagementBatchResults('SESSION-2027-REGULAR', {
      page: 2,
      pageSize: 50,
      sortKey: 'finalScore',
      sortDirection: 'asc',
    });

    expect(requestMock).toHaveBeenCalledWith('/api/v1/results/score-management/batches/SESSION-2027-REGULAR/results/?page=2&pageSize=50&sortKey=finalScore&sortDirection=asc');
    expect(results[0]).toMatchObject({
      candidateId: 'PHL-2027-000001',
      finalScoreDisplay: '193 / 200',
      rank: 1,
      percentile: 99.1234,
    });
  });

  it('sends backend-owned search and release filters for result pages', async () => {
    requestMock.mockResolvedValueOnce({
      ok: true,
      data: {
        count: 0,
        page: 1,
        pageSize: 100,
        results: [],
      },
    });

    await getScoreManagementBatchResultPage('SESSION-2027-REGULAR', {
      search: 'PHL-2027-000123',
      releaseStatus: 'NOT_RELEASED',
    });

    expect(requestMock).toHaveBeenCalledWith('/api/v1/results/score-management/batches/SESSION-2027-REGULAR/results/?page=1&pageSize=100&sortKey=rank&sortDirection=asc&search=PHL-2027-000123&releaseStatus=NOT_RELEASED');
  });

  it('triggers backend processing and refreshes batch/results data', async () => {
    requestMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          id: 'SESSION-2027-REGULAR',
          status: 'SCORING_PROCESSED',
          processingBatchId: 'SCORE-PROC-ABC',
          processedBy: '1',
          processedCount: 471,
          excludedCount: 29,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { count: 1, results: [{ id: 'SESSION-2027-REGULAR', name: 'PhilSA Regular Examination 2027', status: 'SCORING_PROCESSED', isClosed: true, totalCandidates: 500, approvedScores: 471, excludedScores: 29 }] },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { count: 0, page: 1, pageSize: 100, results: [] },
      });

    const processed = await processScoreManagementBatch('SESSION-2027-REGULAR');

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/results/score-management/batches/SESSION-2027-REGULAR/process/',
      { method: 'POST', body: JSON.stringify({ allowReprocessing: false }) },
    );
    expect(processed.batch.status).toBe('SCORING_PROCESSED');
  });

  it('sends allowReprocessing when reprocessing', async () => {
    requestMock
      .mockResolvedValueOnce({
        ok: true,
        data: { id: 'SESSION-2027-REGULAR', status: 'SCORING_PROCESSED', processingBatchId: 'SCORE-PROC-DEF', processedBy: '1', processedCount: 471, excludedCount: 29 },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { count: 1, results: [{ id: 'SESSION-2027-REGULAR', name: 'PhilSA Regular Examination 2027', status: 'SCORING_PROCESSED', isClosed: true, totalCandidates: 500, approvedScores: 471, excludedScores: 29 }] },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { count: 0, page: 1, pageSize: 100, results: [] },
      });

    await reprocessScoreManagementBatch('SESSION-2027-REGULAR');

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/results/score-management/batches/SESSION-2027-REGULAR/process/',
      { method: 'POST', body: JSON.stringify({ allowReprocessing: true }) },
    );
  });

  it('releases the backend batch then refreshes results', async () => {
    requestMock
      .mockResolvedValueOnce({
        ok: true,
        data: { id: 'SESSION-2027-REGULAR', status: 'RESULTS_RELEASED', releasedCount: 471 },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { count: 0, page: 1, pageSize: 100, results: [] },
      });

    await releaseScoreManagementBatch('SESSION-2027-REGULAR');

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/results/score-management/batches/SESSION-2027-REGULAR/release/',
      { method: 'POST' },
    );
  });

  it('requests a backend CSV export', async () => {
    requestBlobMock.mockResolvedValueOnce({
      ok: true,
      data: new Blob(['candidate_id\nPHL-2027-000001\n'], { type: 'text/csv' }),
    });

    const blob = await exportScoreManagementBatch('SESSION-2027-REGULAR');

    expect(requestBlobMock).toHaveBeenCalledWith(
      '/api/v1/results/score-management/batches/SESSION-2027-REGULAR/export/',
    );
    expect(blob.type).toBe('text/csv');
  });
});
