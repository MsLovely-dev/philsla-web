import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentDashboard from './StudentDashboard';

const backendMocks = vi.hoisted(() => ({
  getMyApplication: vi.fn(),
  listExamSlots: vi.fn(),
  assignExamSlot: vi.fn(),
}));

const currentUser = vi.hoisted(() => ({
  value: { id: 'student-1', firstName: 'Jan', email: 'jan@example.test', role: 'STUDENT' as string },
}));

vi.mock('../../PhilSAContext', () => ({
  usePhilSA: () => ({ user: currentUser.value }),
}));

vi.mock('../../services/mockService', () => ({
  useMockData: () => ({ applications: [] }),
}));

vi.mock('../../services/backendApplicationService', async () => {
  const actual = await vi.importActual<typeof import('../../services/backendApplicationService')>(
    '../../services/backendApplicationService',
  );
  return {
    ...actual,
    backendApplicationService: {
      getMyApplication: backendMocks.getMyApplication,
      listExamSlots: backendMocks.listExamSlots,
      assignExamSlot: backendMocks.assignExamSlot,
    },
  };
});

const approvedApplication = {
  id: 'app-1',
  candidateId: 'PHL-2026-ABC123',
  status: 'APPROVED' as const,
  personal: { firstName: 'Jan' },
  address: {},
  school: {},
  coursePreferences: [],
  reviewStep: {},
  examCycleId: '',
  version: 1,
  submittedAt: '2026-05-01T00:00:00Z',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  examStatus: '' as const,
  assignedSlot: null,
};

const slot = {
  id: 'slot-1',
  date: '2026-06-15',
  startTime: '08:00:00',
  endTime: '11:00:00',
  testCenter: 'University of the Philippines Diliman',
  room: 'Benitez Hall R101',
  totalSlots: 50,
  remainingSlots: 45,
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <StudentDashboard />
    </MemoryRouter>,
  );
}

describe('StudentDashboard (backend mode)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'backend');
    backendMocks.getMyApplication.mockReset();
    backendMocks.listExamSlots.mockReset();
    backendMocks.assignExamSlot.mockReset();
    currentUser.value = { id: 'student-1', firstName: 'Jan', email: 'jan@example.test', role: 'STUDENT' };
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the schedule picker for an approved application with no exam slot yet', async () => {
    backendMocks.getMyApplication.mockResolvedValue({ ok: true, data: approvedApplication });
    backendMocks.listExamSlots.mockResolvedValue({ ok: true, data: [slot] });

    renderDashboard();

    expect(await screen.findByText(/select exam schedule/i)).toBeInTheDocument();
    expect(await screen.findByText('Benitez Hall R101')).toBeInTheDocument();
    expect(screen.getByText('BATCH-1')).toBeInTheDocument();
  });

  it('confirming a selected slot assigns it and re-renders the waiting-for-proctor state', async () => {
    const user = userEvent.setup();
    backendMocks.getMyApplication
      .mockResolvedValueOnce({ ok: true, data: approvedApplication })
      .mockResolvedValueOnce({
        ok: true,
        data: { ...approvedApplication, examStatus: 'SCHEDULED', assignedSlot: slot },
      });
    backendMocks.listExamSlots.mockResolvedValue({ ok: true, data: [slot] });
    backendMocks.assignExamSlot.mockResolvedValue({
      ok: true,
      data: { ...approvedApplication, examStatus: 'SCHEDULED', assignedSlot: slot },
    });

    renderDashboard();

    await screen.findByText('Benitez Hall R101');
    await user.click(screen.getByRole('radio', { name: /select benitez hall r101/i }));
    await user.click(screen.getByRole('button', { name: /confirm selected slot/i }));

    await waitFor(() => expect(backendMocks.assignExamSlot).toHaveBeenCalledWith('slot-1'));
    expect(await screen.findByText(/wait for proctor to start the exam/i)).toBeInTheDocument();
  });

  it('shows an inline error and keeps the picker when the slot is full', async () => {
    const user = userEvent.setup();
    backendMocks.getMyApplication.mockResolvedValue({ ok: true, data: approvedApplication });
    backendMocks.listExamSlots.mockResolvedValue({ ok: true, data: [slot] });
    backendMocks.assignExamSlot.mockResolvedValue({
      ok: false,
      error: { kind: 'CONFLICT', message: 'This exam slot is full.' },
    });

    renderDashboard();

    await screen.findByText('Benitez Hall R101');
    await user.click(screen.getByRole('radio', { name: /select benitez hall r101/i }));
    await user.click(screen.getByRole('button', { name: /confirm selected slot/i }));

    expect(await screen.findByText('This exam slot is full.')).toBeInTheDocument();
    expect(screen.getByText(/select exam schedule/i)).toBeInTheDocument();
  });

  it('shows the no-application empty state when the account has none', async () => {
    backendMocks.getMyApplication.mockResolvedValue({ ok: true, data: null });

    renderDashboard();

    expect(await screen.findByText(/no application found/i)).toBeInTheDocument();
  });

  it('renders real requiredCorrections and links to the real correction flow for a FOR_CORRECTION application', async () => {
    backendMocks.getMyApplication.mockResolvedValue({
      ok: true,
      data: {
        ...approvedApplication,
        status: 'FOR_CORRECTION',
        reviewStep: {
          requiredCorrections: ['gradeRecordsUrl', 'photoUrl'],
          reviewerReason: 'Form 137 copy was unreadable.',
        },
      },
    });

    renderDashboard();

    expect(await screen.findByText('Form 137 copy was unreadable.')).toBeInTheDocument();
    expect(screen.getByText('Form 137')).toBeInTheDocument();
    expect(screen.getByText('ID Photo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /fix & resubmit/i })).toHaveAttribute('href', '/student/application');
  });

  it('shows synthetic demo slots for a SYSTEM_ADMIN preview without calling the STUDENT-only backend endpoint', async () => {
    currentUser.value = { id: 'admin-1', firstName: 'Backend', email: 'admin@example.test', role: 'SYSTEM_ADMIN' };
    backendMocks.getMyApplication.mockResolvedValue({ ok: true, data: null });

    renderDashboard();

    expect(await screen.findByText(/preview mode/i)).toBeInTheDocument();
    expect(await screen.findByText('Benitez Hall R101')).toBeInTheDocument();
    expect(screen.getByText('SEC Lecture Hall 1')).toBeInTheDocument();
    expect(backendMocks.listExamSlots).not.toHaveBeenCalled();
  });

  it('completes the SYSTEM_ADMIN preview flow through to the waiting-for-proctor state and persists the chosen slot', async () => {
    const user = userEvent.setup();
    currentUser.value = { id: 'admin-1', firstName: 'Backend', email: 'admin@example.test', role: 'SYSTEM_ADMIN' };
    backendMocks.getMyApplication.mockResolvedValue({ ok: true, data: null });

    renderDashboard();

    await screen.findByText('Benitez Hall R101');
    await user.click(screen.getByRole('radio', { name: /select benitez hall r101/i }));
    await user.click(screen.getByRole('button', { name: /confirm selected slot/i }));

    expect(await screen.findByText(/wait for proctor to start the exam/i)).toBeInTheDocument();
    expect(backendMocks.assignExamSlot).not.toHaveBeenCalled();
    expect(localStorage.getItem('philsa_admin_preview_slot_id')).toBe('preview-slot-1');
  });
});
