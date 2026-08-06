import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScoreCandidateDetail from './ScoreCandidateDetail';
import { getScoreManagementCandidateProfile } from '../../services/scoreManagementService';

vi.mock('../../services/scoreManagementService', async () => {
  const actual = await vi.importActual<typeof import('../../services/scoreManagementService')>(
    '../../services/scoreManagementService',
  );

  return {
    ...actual,
    getScoreManagementCandidateProfile: vi.fn(),
  };
});

const getProfileMock = vi.mocked(getScoreManagementCandidateProfile);

function renderDetail() {
  render(
    <MemoryRouter initialEntries={['/admin/results/scores/SESSION-2027-REGULAR/PHL-2027-000001']}>
      <Routes>
        <Route path="/admin/results/scores/:batchId/:candidateId" element={<ScoreCandidateDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ScoreCandidateDetail', () => {
  beforeEach(() => {
    getProfileMock.mockReset();
    getProfileMock.mockResolvedValue({
      score: {
        id: 'SCORE-PHL-2027-000001',
        candidateId: 'PHL-2027-000001',
        lrn: '109000000001',
        candidateName: 'Alon Reyes',
        examName: 'SESSION-2027-REGULAR',
        examSetId: 'ES-BP0001',
        rawScore: 193,
        maxScore: 200,
        finalScore: 96.5,
        finalScoreDisplay: '193 / 200',
        percentile: 99.1234,
        rank: 1,
        releaseStatus: 'NOT_RELEASED',
        publishedAt: null,
      },
      profile: {
        id: 'app-id',
        candidateId: 'PS-2027-ABCD-EFGH',
        status: 'SUBMITTED',
        photoUrl: '',
        personal: {
          firstName: 'Alon',
          lastName: 'Reyes',
          email: 'alon.reyes@example.test',
          identityVerificationStatus: 'VERIFIED',
        },
        address: {},
        school: {},
        coursePreferences: [],
        reviewStep: {},
        activityLogs: [],
        examCycleId: '2027',
        submittedAt: '2026-08-05T00:00:00Z',
      },
    });
  });

  it('does not synthesize verification log rows when backend logs are empty', async () => {
    renderDetail();

    await waitFor(() => expect(screen.getByText('No matched verification activity found for this candidate.')).not.toBeNull());
    expect(screen.queryByText('OTP Verification Successful')).toBeNull();
    expect(screen.queryByText('Account Credentials Created')).toBeNull();
    expect(screen.queryByText('Biometric Liveness Verification')).toBeNull();
  });

  it('returns to score management with the selected batch in the URL', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/results/scores/SESSION-2027-STEM/PHL-2027-STEM-000001']}>
        <Routes>
          <Route path="/admin/results/scores/:batchId/:candidateId" element={<ScoreCandidateDetail />} />
          <Route path="/admin/results/scores" element={<div>Score Management List</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /back to score management/i }));

    expect(screen.getByText('Score Management List')).not.toBeNull();
  });
});
