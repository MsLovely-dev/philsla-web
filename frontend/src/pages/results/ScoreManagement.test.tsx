import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScoreManagement from './ScoreManagement';
import {
  getScoreManagementBatchResultPage,
  getScoreManagementBatches,
  type ScoreBatchStatus,
} from '../../services/scoreManagementService';

vi.mock('../../services/scoreManagementService', async () => {
  const actual = await vi.importActual<typeof import('../../services/scoreManagementService')>(
    '../../services/scoreManagementService',
  );

  return {
    ...actual,
    getScoreManagementBatches: vi.fn(),
    getScoreManagementBatchResultPage: vi.fn(),
    exportScoreManagementBatch: vi.fn(),
    processScoreManagementBatch: vi.fn(),
    releaseScoreManagementBatch: vi.fn(),
    reprocessScoreManagementBatch: vi.fn(),
  };
});

const getBatchesMock = vi.mocked(getScoreManagementBatches);
const getResultPageMock = vi.mocked(getScoreManagementBatchResultPage);

function mockBatchStatus(status: ScoreBatchStatus) {
  getBatchesMock.mockResolvedValue([
    {
      id: 'SESSION-2027-REGULAR',
      label: 'Batch 1 - May 2027',
      examName: 'PhilSA NAT',
      status,
      totalCandidates: 500,
      processingBatchId: status === 'READY_FOR_PROCESSING' ? '' : 'SCORE-PROC-001',
      processedAt: status === 'READY_FOR_PROCESSING' ? null : '2026-08-03T08:00:00Z',
      processedBy: status === 'READY_FOR_PROCESSING' ? null : 'admin-1',
    },
  ]);
}

async function renderScoreManagement(initialEntries = ['/admin/results/scores']) {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <ScoreManagement />
    </MemoryRouter>,
  );

  await waitFor(() => expect(screen.getByText('Examination Score Management')).not.toBeNull());
}

describe('ScoreManagement', () => {
  beforeEach(() => {
    mockBatchStatus('SCORING_PROCESSED');
    getResultPageMock.mockResolvedValue({
      count: 0,
      page: 1,
      pageSize: 100,
      results: [],
    });
  });

  it('shows an enabled process action before scoring is processed', async () => {
    mockBatchStatus('READY_FOR_PROCESSING');

    await renderScoreManagement();

    expect(screen.getByRole<HTMLButtonElement>('button', { name: /process scoring/i }).disabled).toBe(false);
  });

  it('shows an enabled reprocess action after scoring is processed', async () => {
    await renderScoreManagement();

    expect(screen.getByRole<HTMLButtonElement>('button', { name: /reprocess scoring/i }).disabled).toBe(false);
  });

  it('loads the selected batch from the URL query when returning from candidate detail', async () => {
    getBatchesMock.mockResolvedValue([
      {
        id: 'SESSION-2027-REGULAR',
        label: 'Regular Batch',
        examName: 'PhilSA NAT',
        status: 'SCORING_PROCESSED',
        totalCandidates: 500,
        processingBatchId: 'SCORE-PROC-001',
        processedAt: '2026-08-03T08:00:00Z',
        processedBy: 'admin-1',
      },
      {
        id: 'SESSION-2027-STEM',
        label: 'STEM Batch',
        examName: 'PhilSA STEM',
        status: 'SCORING_PROCESSED',
        totalCandidates: 250,
        processingBatchId: 'SCORE-PROC-002',
        processedAt: '2026-08-03T08:00:00Z',
        processedBy: 'admin-1',
      },
    ]);

    await renderScoreManagement(['/admin/results/scores?batch=SESSION-2027-STEM']);

    await waitFor(() => expect(getResultPageMock).toHaveBeenCalledWith('SESSION-2027-STEM', expect.objectContaining({
      page: 1,
      pageSize: 100,
      sortKey: 'finalScore',
      sortDirection: 'desc',
    })));
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: /select examination batch/i }).value).toBe('SESSION-2027-STEM');
  });

  it('shows the candidate identifier in the results table', async () => {
    getResultPageMock.mockResolvedValue({
      count: 1,
      page: 1,
      pageSize: 100,
      results: [
        {
          id: 'SCORE-PHL-2027-000123',
          candidateId: 'PHL-2027-000123',
          lrn: '123456789012',
          candidateName: 'Maria Santos',
          examName: 'PhilSA NAT',
          examSetId: 'ES-BP0001',
          rawScore: 27,
          maxScore: 30,
          finalScore: 90,
          finalScoreDisplay: '27 / 30',
          percentile: 97.5,
          rank: 12,
          releaseStatus: 'NOT_RELEASED',
          publishedAt: null,
        },
      ],
    });

    await renderScoreManagement();

    expect(screen.getByText('Candidate ID')).not.toBeNull();
    expect(screen.getByText('PHL-2027-000123')).not.toBeNull();
  });

  it('requests backend-filtered results when searching', async () => {
    await renderScoreManagement();
    getResultPageMock.mockClear();

    await userEvent.type(screen.getByPlaceholderText('Search candidate ID or name...'), 'PHL-2027-000123');

    await waitFor(() => expect(getResultPageMock).toHaveBeenLastCalledWith('SESSION-2027-REGULAR', expect.objectContaining({
      page: 1,
      pageSize: 100,
      search: 'PHL-2027-000123',
      sortKey: 'finalScore',
      sortDirection: 'desc',
    })));
  });

  it('does not drop a search entered while results are loading', async () => {
    getResultPageMock.mockImplementationOnce(() => new Promise(() => undefined));

    await renderScoreManagement();
    await waitFor(() => expect(getResultPageMock.mock.calls.length).toBeGreaterThan(0));
    getResultPageMock.mockClear();

    await userEvent.type(screen.getByPlaceholderText('Search candidate ID or name...'), 'PHL-2027-000123');

    await waitFor(() => expect(getResultPageMock).toHaveBeenLastCalledWith('SESSION-2027-REGULAR', expect.objectContaining({
      page: 1,
      pageSize: 100,
      search: 'PHL-2027-000123',
      sortKey: 'finalScore',
      sortDirection: 'desc',
    })));
  });

  it('disables reprocessing after results are released', async () => {
    mockBatchStatus('RESULTS_RELEASED');

    await renderScoreManagement();

    const button = screen.getByRole<HTMLButtonElement>('button', { name: /reprocess scoring/i });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('title')).toBe('Released results cannot be reprocessed.');
  });

  it('disables release after results are already released', async () => {
    mockBatchStatus('RESULTS_RELEASED');

    await renderScoreManagement();

    expect(screen.getByRole<HTMLButtonElement>('button', { name: /release results/i }).disabled).toBe(true);
  });
});
