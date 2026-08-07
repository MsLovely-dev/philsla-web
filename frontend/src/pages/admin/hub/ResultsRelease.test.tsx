import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { networkError, serviceSuccess, type ServiceResult } from '../../../services/serviceResult';
import { resultsReleaseService, type ResultsReleaseResponse, type ResultsReleaseSummary } from '../../../services/resultsReleaseService';
import ResultsRelease from './ResultsRelease';

vi.mock('../../../services/resultsReleaseService', () => ({
  resultsReleaseService: { list: vi.fn(), process: vi.fn(), release: vi.fn() },
}));

const readySession: ResultsReleaseSummary = {
  id: 'SESSION-2027-REGULAR',
  name: 'PhilSA Regular Examination 2027',
  status: 'READY_FOR_PROCESSING',
  isClosed: true,
  totalCandidates: 120,
  approvedScores: 110,
  excludedScores: 10,
  processedScores: 0,
  releasedScores: 0,
  processedAt: null,
  releasedAt: null,
  processingReady: true,
  releaseReady: false,
};

const processedSession: ResultsReleaseSummary = {
  ...readySession,
  status: 'SCORING_PROCESSED',
  processedScores: 110,
  processingReady: false,
  releaseReady: true,
};

const releasedSession: ResultsReleaseSummary = {
  ...processedSession,
  status: 'RESULTS_RELEASED',
  releasedScores: 110,
  releaseReady: false,
  releasedAt: '2026-08-07T08:00:00Z',
};

const listMock = vi.mocked(resultsReleaseService.list);
const processMock = vi.mocked(resultsReleaseService.process);
const releaseMock = vi.mocked(resultsReleaseService.release);

function renderResultsRelease() {
  render(<MemoryRouter><ResultsRelease /></MemoryRouter>);
}

function listSuccess(...sessions: ResultsReleaseSummary[]) {
  return serviceSuccess({ count: sessions.length, page: 1, pageSize: 25, results: sessions });
}

describe('ResultsRelease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue(listSuccess(readySession));
  });

  it('renders server-provided release summaries and readiness actions', async () => {
    renderResultsRelease();

    expect(await screen.findByText('PhilSA Regular Examination 2027')).toBeInTheDocument();
    expect(screen.getAllByText('120')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: /process approved scores/i })).toBeEnabled();
    expect(screen.getAllByText('Ready for processing')).not.toHaveLength(0);
  });

  it('shows an empty state when no release summaries exist', async () => {
    listMock.mockResolvedValue(listSuccess());
    renderResultsRelease();

    expect(await screen.findByText(/no examination sessions are available/i)).toBeInTheDocument();
  });

  it('shows a safe load error and retries the summary request', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce(networkError('Results could not be loaded.')).mockResolvedValueOnce(listSuccess(readySession));
    renderResultsRelease();

    expect(await screen.findByRole('alert')).toHaveTextContent('Results could not be loaded.');
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('PhilSA Regular Examination 2027')).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it('processes a ready session only after confirmation and refreshes it', async () => {
    const user = userEvent.setup();
    processMock.mockResolvedValue(serviceSuccess({
      id: readySession.id, status: 'SCORING_PROCESSED', processingBatchId: 'PROCESS-1', processedBy: null, processedCount: 110, excludedCount: 10,
    }));
    listMock.mockResolvedValueOnce(listSuccess(readySession)).mockResolvedValueOnce(listSuccess(processedSession));
    renderResultsRelease();

    await user.click(await screen.findByRole('button', { name: /process approved scores/i }));
    expect(processMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /confirm processing/i }));

    await waitFor(() => expect(processMock).toHaveBeenCalledWith(readySession.id));
    expect(await screen.findByRole('button', { name: /release results/i })).toBeEnabled();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it('releases processed results only after confirmation and renders the released state', async () => {
    const user = userEvent.setup();
    releaseMock.mockResolvedValue(serviceSuccess({
      id: processedSession.id, status: 'RESULTS_RELEASED', releasedCount: 110, notificationQueuedCount: 0, notificationSkippedCount: 0, notificationFailedCount: 0,
    }));
    listMock.mockResolvedValueOnce(listSuccess(processedSession)).mockResolvedValueOnce(listSuccess(releasedSession));
    renderResultsRelease();

    await user.click(await screen.findByRole('button', { name: /release results/i }));
    expect(releaseMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /confirm release/i }));

    await waitFor(() => expect(releaseMock).toHaveBeenCalledWith(processedSession.id));
    expect((await screen.findAllByText('Results released')).length).toBeGreaterThan(0);
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending release without calling the service', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(listSuccess(processedSession));
    renderResultsRelease();

    await user.click(await screen.findByRole('button', { name: /release results/i }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(releaseMock).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('prevents duplicate submissions while a release is pending', async () => {
    const user = userEvent.setup();
    let resolveRelease: (value: ServiceResult<ResultsReleaseResponse>) => void = () => undefined;
    releaseMock.mockReturnValue(new Promise((resolve) => { resolveRelease = resolve; }));
    listMock.mockResolvedValue(listSuccess(processedSession));
    renderResultsRelease();

    await user.click(await screen.findByRole('button', { name: /release results/i }));
    const confirm = screen.getByRole('button', { name: /confirm release/i });
    await user.click(confirm);
    await user.click(confirm);

    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Release results' })).toBeDisabled();
    resolveRelease(serviceSuccess({ id: processedSession.id, status: 'RESULTS_RELEASED', releasedCount: 110, notificationQueuedCount: 0, notificationSkippedCount: 0, notificationFailedCount: 0 }));
  });

  it('keeps the confirmation open and displays a safe action error', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(listSuccess(processedSession));
    releaseMock.mockResolvedValue(networkError('Release could not be completed.'));
    renderResultsRelease();

    await user.click(await screen.findByRole('button', { name: /release results/i }));
    await user.click(screen.getByRole('button', { name: /confirm release/i }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Release could not be completed.');
  });
});
