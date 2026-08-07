import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentApplication from './StudentApplication';

const backendMocks = vi.hoisted(() => ({
  getMyApplication: vi.fn(),
  listPublicStudentRegistrationFields: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock('../PhilSAContext', () => ({
  usePhilSA: () => ({
    user: { id: 'student-1', firstName: 'Jan', lastName: 'Delacruz', role: 'STUDENT' },
    addAuditLog: vi.fn(),
    inputModules: [],
    addTicket: vi.fn(),
  }),
}));

vi.mock('../services/mockService', () => ({
  useMockData: () => ({ applications: [] }),
}));

vi.mock('../services/backendApplicationService', async () => {
  const actual = await vi.importActual<typeof import('../services/backendApplicationService')>(
    '../services/backendApplicationService',
  );
  return {
    ...actual,
    backendApplicationService: {
      ...actual.backendApplicationService,
      getMyApplication: backendMocks.getMyApplication,
      listPublicStudentRegistrationFields: backendMocks.listPublicStudentRegistrationFields,
    },
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentApplication />
    </MemoryRouter>,
  );
}

describe('StudentApplication tracking view (backend mode)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'backend');
    backendMocks.getMyApplication.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the real tracking view -- not the fresh registration wizard -- for a returning student with an already-submitted application', async () => {
    backendMocks.getMyApplication.mockResolvedValue({
      ok: true,
      data: {
        id: 'app-1',
        candidateId: 'PHL-2026-ABC123',
        status: 'ACCEPTED',
        personal: { firstName: 'Jan', lastName: 'Delacruz' },
        address: {},
        school: {},
        coursePreferences: [],
        reviewStep: {},
        examCycleId: '',
        version: 1,
        submittedAt: '2026-05-01T00:00:00Z',
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      },
    });

    renderPage();

    expect(await screen.findByText('Application Tracking')).toBeInTheDocument();
    expect(screen.queryByText('Identity & Biometrics')).not.toBeInTheDocument();
  });

  it('falls through to the fresh registration wizard when the account has no application', async () => {
    backendMocks.getMyApplication.mockResolvedValue({ ok: true, data: null });

    renderPage();

    expect(await screen.findByText('Data Privacy Notice and Consent Form')).toBeInTheDocument();
    expect(screen.queryByText('Application Tracking')).not.toBeInTheDocument();
  });
});
