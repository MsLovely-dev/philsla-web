import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { networkError, serviceSuccess, type ServiceResult } from '../../services/serviceResult';
import { resultsAnalyticsService, type ResultsAnalyticsOverview } from '../../services/resultsAnalyticsService';
import ReportingMatrix from './ReportingMatrix';

vi.mock('../../services/resultsAnalyticsService', () => ({
  resultsAnalyticsService: { getOverview: vi.fn() },
}));

vi.mock('../../PhilSAContext', () => ({
  usePhilSA: () => ({ user: null }),
}));

const overview: ResultsAnalyticsOverview = {
  releasedCandidates: 3,
  releasedSessions: 1,
  meanFinalScore: 82.5,
  scoreBands: [
    { label: '0-59.99', minimum: 0, maximum: 59.99, count: 0 },
    { label: '60-69.99', minimum: 60, maximum: 69.99, count: 0 },
    { label: '70-79.99', minimum: 70, maximum: 79.99, count: 1 },
    { label: '80-89.99', minimum: 80, maximum: 89.99, count: 1 },
    { label: '90-100', minimum: 90, maximum: 100, count: 1 },
  ],
  sessions: [{
    sessionId: 'SESSION-2027-REGULAR',
    sessionName: 'PhilSA Regular Examination 2027',
    releasedCandidates: 3,
    meanFinalScore: 82.5,
    releasedAt: '2026-08-03T08:00:00+00:00',
  }],
};

const getOverviewMock = vi.mocked(resultsAnalyticsService.getOverview);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe('ReportingMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOverviewMock.mockResolvedValue(serviceSuccess(overview));
  });

  it('renders persisted released-result aggregates without unsupported breakdowns', async () => {
    render(<ReportingMatrix />);

    expect(await screen.findByRole('heading', { name: 'Released Results Overview' })).toBeInTheDocument();
    expect(screen.getAllByText('3')).not.toHaveLength(0);
    expect(screen.getAllByText('82.5')).not.toHaveLength(0);
    expect(screen.getByRole('cell', { name: '70-79.99' })).toBeInTheDocument();
    expect(screen.getByText('PhilSA Regular Examination 2027')).toBeInTheDocument();
    expect(screen.queryByText(/qualified candidates|regional distribution|university quota|course applications/i)).not.toBeInTheDocument();
  });

  it('shows an accessible loading state before aggregates arrive', () => {
    getOverviewMock.mockReturnValue(new Promise(() => undefined));
    render(<ReportingMatrix />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading released results analytics');
  });

  it('renders an empty state when the server has no released results', async () => {
    getOverviewMock.mockResolvedValue(serviceSuccess({
      releasedCandidates: 0,
      releasedSessions: 0,
      meanFinalScore: null,
      scoreBands: [],
      sessions: [],
    }));
    render(<ReportingMatrix />);

    expect(await screen.findByText('No released result data yet')).toBeInTheDocument();
  });

  it('shows a safe error and retries the aggregate request', async () => {
    const user = userEvent.setup();
    getOverviewMock.mockResolvedValueOnce(networkError('Internal backend detail.')).mockResolvedValueOnce(serviceSuccess(overview));
    render(<ReportingMatrix />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Released results analytics could not be loaded.');
    expect(screen.queryByText('Internal backend detail.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('PhilSA Regular Examination 2027')).toBeInTheDocument();
    expect(getOverviewMock).toHaveBeenCalledTimes(2);
  });

  it('renders null optional session fields without inventing values', async () => {
    getOverviewMock.mockResolvedValue(serviceSuccess({
      ...overview,
      meanFinalScore: null,
      sessions: [{ ...overview.sessions[0], meanFinalScore: null, releasedAt: null }],
    }));
    render(<ReportingMatrix />);

    expect((await screen.findAllByText('Not available'))).toHaveLength(3);
  });

  it('ignores an older request after retry starts a newer request', async () => {
    const user = userEvent.setup();
    const firstRequest = deferred<ServiceResult<ResultsAnalyticsOverview>>();
    const retryRequest = deferred<ServiceResult<ResultsAnalyticsOverview>>();
    getOverviewMock.mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(retryRequest.promise);
    render(<ReportingMatrix />);

    await user.click(screen.getByRole('button', { name: 'Refresh analytics' }));
    retryRequest.resolve(serviceSuccess({ ...overview, sessions: [{ ...overview.sessions[0], sessionName: 'Current released session' }] }));
    expect(await screen.findByText('Current released session')).toBeInTheDocument();

    await act(async () => {
      firstRequest.resolve(serviceSuccess({ ...overview, sessions: [{ ...overview.sessions[0], sessionName: 'Stale released session' }] }));
      await Promise.resolve();
    });
    expect(screen.queryByText('Stale released session')).not.toBeInTheDocument();
  });
});
