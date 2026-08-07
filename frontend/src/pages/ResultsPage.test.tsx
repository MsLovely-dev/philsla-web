import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsPage from './ResultsPage';

const currentUser = vi.hoisted(() => ({
  value: { id: 'student-1', firstName: 'Ana', role: 'STUDENT' as string, candidateId: 'CAND-1' },
}));

const backendMocks = vi.hoisted(() => ({
  getMyResult: vi.fn(),
}));

vi.mock('../PhilSAContext', () => ({
  usePhilSA: () => ({ user: currentUser.value }),
}));

vi.mock('../services/backendResultService', async () => {
  const actual = await vi.importActual<typeof import('../services/backendResultService')>(
    '../services/backendResultService',
  );
  return {
    ...actual,
    resultService: { getMyResult: backendMocks.getMyResult },
  };
});

describe('ResultsPage (backend mode)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'backend');
    currentUser.value = { id: 'student-1', firstName: 'Ana', role: 'STUDENT', candidateId: 'CAND-1' };
    backendMocks.getMyResult.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the real final score once fetched', async () => {
    backendMocks.getMyResult.mockResolvedValue({
      ok: true,
      data: {
        id: 'SCORE-CAND-1',
        candidateId: 'CAND-1',
        rawScore: 180,
        maxScore: 200,
        finalScore: 90,
        overallRank: 5,
        percentile: 95,
        releaseStatus: 'RELEASED',
        releasedAt: '2026-08-01T00:00:00Z',
        examSetId: 'ES-TEST0001',
        sessionId: 'SESSION-TEST',
      },
    });

    render(<ResultsPage />);

    expect(await screen.findByText('90.0')).toBeInTheDocument();
    expect(screen.getByText('CAND-1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows a not-yet-released state when there is no released score', async () => {
    backendMocks.getMyResult.mockResolvedValue({ ok: true, data: null });

    render(<ResultsPage />);

    expect(await screen.findByText(/results not yet released/i)).toBeInTheDocument();
  });

  it('shows a labeled sample report (not "not yet released") when a System Admin previews with no real result', async () => {
    currentUser.value = { id: 'admin-1', firstName: 'Backend', role: 'SYSTEM_ADMIN', candidateId: '' };
    backendMocks.getMyResult.mockResolvedValue({ ok: true, data: null });

    render(<ResultsPage />);

    expect(await screen.findByText('Performance & Assessment Report')).toBeInTheDocument();
    expect(screen.getByText(/preview mode/i)).toBeInTheDocument();
    expect(screen.getByText('CAND-2026-8809')).toBeInTheDocument();
    expect(screen.queryByText(/results not yet released/i)).not.toBeInTheDocument();
  });
});

describe('ResultsPage (prototype mode)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'prototype');
    backendMocks.getMyResult.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the hardcoded mock preview without calling the backend service', () => {
    render(<ResultsPage />);

    expect(screen.getByText('Performance & Assessment Report')).toBeInTheDocument();
    expect(backendMocks.getMyResult).not.toHaveBeenCalled();
  });
});
