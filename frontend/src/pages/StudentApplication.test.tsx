import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentApplication from './StudentApplication';
import { backendApplicationService } from '../services/backendApplicationService';

vi.mock('../PhilSAContext', () => ({
  usePhilSA: () => ({
    user: null,
    addAuditLog: vi.fn(),
    addTicket: vi.fn(),
    inputModules: [{ id: 'student_reg', isActive: true }],
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

describe('StudentApplication integration status', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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
