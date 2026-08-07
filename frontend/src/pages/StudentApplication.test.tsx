import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      verifyLrn: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          verificationToken: 'verification-token',
          expiresInSeconds: 900,
          profile: {
            lrn: '817222062752',
            firstName: 'Juan',
            middleName: '',
            lastName: 'Garcia',
            extensionName: '',
            dateOfBirth: '2012-08-07',
            sex: 'Female',
            schoolId: 'TEST-0001',
            schoolName: 'Sample National High School',
            gradeLevel: 'Grade 12',
            enrollmentStatus: 'Enrolled',
            schoolYear: 'TBD',
            identityVerified: true,
            currentGrade12EnrollmentConfirmed: true,
            requiresAdmissionsReviewerAttention: false,
          },
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

  it('verifies LRN on the first valid click', async () => {
    vi.mocked(backendApplicationService.listPublicStudentRegistrationFields).mockResolvedValueOnce({
      ok: true,
      data: [
        { id: 'lrn', section: 'Step 1 Registration', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: true },
        { id: 'manual', section: 'Step 1 Registration', type: 'Verification Method', value: 'Manual Entry', status: false },
        { id: 'philsys', section: 'Step 1 Registration', type: 'Verification Method', value: 'PhilSys National ID', status: false },
      ],
    });
    const user = userEvent.setup();
    render(<StudentApplication />);

    await user.click(screen.getByLabelText(/I have read and understood this Notice/i));
    await user.click(screen.getByRole('button', { name: /I Agree & Accept/i }));
    await user.type(await screen.findByPlaceholderText(/101234567890/i), '817222062752');
    await user.type(screen.getByPlaceholderText(/YYYY-MM-DD/i), '2012-08-07');
    await user.click(screen.getByRole('button', { name: /Verify Information/i }));

    expect(backendApplicationService.verifyLrn).toHaveBeenCalledTimes(1);
    expect(backendApplicationService.verifyLrn).toHaveBeenCalledWith('817222062752', {
      category: 'birthday',
      value: '2012-08-07',
    });
    expect(await screen.findByText(/LRN identity verified/i)).toBeInTheDocument();
    await waitFor(() => {
      const draft = JSON.parse(sessionStorage.getItem('philsa_student_registration_session_draft') ?? '{}');
      expect(draft.formData?.email).not.toBe('aurelio.delacruz@philsys.gov.ph');
    });
  });

  it('ignores duplicate LRN verification clicks while the request is in flight', async () => {
    vi.mocked(backendApplicationService.listPublicStudentRegistrationFields).mockResolvedValueOnce({
      ok: true,
      data: [
        { id: 'lrn', section: 'Step 1 Registration', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: true },
        { id: 'manual', section: 'Step 1 Registration', type: 'Verification Method', value: 'Manual Entry', status: false },
        { id: 'philsys', section: 'Step 1 Registration', type: 'Verification Method', value: 'PhilSys National ID', status: false },
      ],
    });
    vi.mocked(backendApplicationService.verifyLrn).mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    render(<StudentApplication />);

    await user.click(screen.getByLabelText(/I have read and understood this Notice/i));
    await user.click(screen.getByRole('button', { name: /I Agree & Accept/i }));
    await user.type(await screen.findByPlaceholderText(/101234567890/i), '817222062752');
    await user.type(screen.getByPlaceholderText(/YYYY-MM-DD/i), '2012-08-07');
    const verifyButton = screen.getByRole('button', { name: /Verify Information/i });
    fireEvent.click(verifyButton);
    fireEvent.click(verifyButton);

    expect(backendApplicationService.verifyLrn).toHaveBeenCalledTimes(1);
  });

  it('does not reverify the same LRN details after a successful verification', async () => {
    vi.mocked(backendApplicationService.listPublicStudentRegistrationFields).mockResolvedValueOnce({
      ok: true,
      data: [
        { id: 'lrn', section: 'Step 1 Registration', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: true },
        { id: 'manual', section: 'Step 1 Registration', type: 'Verification Method', value: 'Manual Entry', status: false },
        { id: 'philsys', section: 'Step 1 Registration', type: 'Verification Method', value: 'PhilSys National ID', status: false },
      ],
    });
    const user = userEvent.setup();
    render(<StudentApplication />);

    await user.click(screen.getByLabelText(/I have read and understood this Notice/i));
    await user.click(screen.getByRole('button', { name: /I Agree & Accept/i }));
    await user.type(await screen.findByPlaceholderText(/101234567890/i), '817222062752');
    await user.type(screen.getByPlaceholderText(/YYYY-MM-DD/i), '2012-08-07');
    await user.click(screen.getByRole('button', { name: /Verify Information/i }));
    await screen.findByText(/LRN identity verified/i);
    await user.click(screen.getByRole('button', { name: /Verified/i }));

    expect(backendApplicationService.verifyLrn).toHaveBeenCalledTimes(1);
  });
});
