import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentApplication from './StudentApplication';
import { backendApplicationService } from '../services/backendApplicationService';

const currentUser = vi.hoisted(() => ({
  value: null as { id: string; firstName: string; lastName: string; role: string } | null,
}));

const backendMocks = vi.hoisted(() => ({
  getMyApplication: vi.fn(),
}));

vi.mock('../PhilSAContext', () => ({
  usePhilSA: () => ({
    user: currentUser.value,
    addAuditLog: vi.fn(),
    inputModules: [{ id: 'student_reg', isActive: true }],
    addTicket: vi.fn(),
  }),
}));

vi.mock('../services/mockService', () => ({
  useMockData: () => ({
    applications: [],
    setApplications: vi.fn(),
  }),
}));

vi.mock('../services/backendApplicationService', async () => {
  const actual = await vi.importActual<typeof import('../services/backendApplicationService')>('../services/backendApplicationService');
  return {
    ...actual,
    backendApplicationService: {
      ...actual.backendApplicationService,
      getMyApplication: backendMocks.getMyApplication,
      listPublicStudentRegistrationFields: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          { id: 'manual', section: 'Step 1 Registration', type: 'Verification Method', value: 'Manual Entry', status: true },
          { id: 'lrn', section: 'Step 1 Registration', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: false },
          { id: 'philsys', section: 'Step 1 Registration', type: 'Verification Method', value: 'PhilSys National ID', status: false },
        ],
      }),
      getRegistrationIntegrationStatus: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          backend: { status: 'connected' },
          methods: [
            { id: 'manual', label: 'Manual Registration', status: 'available', active: true, message: 'Manual Registration is available.' },
            { id: 'lrn', label: 'LRN Verification', status: 'placeholder', active: false, message: 'LRN verification is prepared for provider integration but no live DepEd connection is active.' },
            { id: 'philsys', label: 'PhilSys National ID', status: 'locked', active: false, message: 'PhilSys National ID integration is locked until official API requirements are approved.' },
          ],
        },
      }),
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
    currentUser.value = { id: 'student-1', firstName: 'Jan', lastName: 'Delacruz', role: 'STUDENT' };
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

describe('StudentApplication integration status', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    currentUser.value = null;
    vi.clearAllMocks();
  });

  it('shows backend connectivity and keeps manual registration available', async () => {
    const user = userEvent.setup();
    render(<StudentApplication />);

    await user.click(screen.getByLabelText(/I have read and understood this Notice/i));
    await user.click(screen.getByRole('button', { name: /I Agree & Accept/i }));

    expect(await screen.findByText(/PhilSLA API connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Manual Registration is available/i)).toBeInTheDocument();
    expect(screen.getByText(/no live DepEd connection is active/i)).toBeInTheDocument();
    expect(backendApplicationService.getRegistrationIntegrationStatus).toHaveBeenCalled();
  });
});
