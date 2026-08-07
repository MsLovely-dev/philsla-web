import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Blueprint } from './admin/hub/blueprintMockData';
import ExamBlueprints from './ExamBlueprints';

const { listBlueprints, createBlueprint, updateBlueprint, cloneBlueprint, deleteBlueprint, transitionBlueprint } = vi.hoisted(() => ({
  listBlueprints: vi.fn(),
  createBlueprint: vi.fn(),
  updateBlueprint: vi.fn(),
  cloneBlueprint: vi.fn(),
  deleteBlueprint: vi.fn(),
  transitionBlueprint: vi.fn(),
}));

type MockUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SYSTEM_ADMIN' | 'EXAM_ADMINISTRATOR';
};

const currentUser: MockUser = {
  id: 'system-admin-user',
  email: 'system.admin@example.test',
  firstName: 'System',
  lastName: 'Admin',
  role: 'SYSTEM_ADMIN',
};

vi.mock('../PhilSAContext', () => ({
  usePhilSA: () => ({ user: currentUser }),
}));

vi.mock('../components/ExamHubTabs', () => ({
  ExamHubTabs: () => null,
}));

vi.mock('../services/backendExamBlueprintService', () => ({
  examBlueprintService: {
    listBlueprints,
    createBlueprint,
    updateBlueprint,
    cloneBlueprint,
    deleteBlueprint,
    transitionBlueprint,
  },
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const blueprintFixture: Blueprint = {
  id: 'BP-001',
  currentVersionId: 'BPV-001',
  code: 'BP-2026-TEST-01',
  name: 'Exam Blueprint with Points',
  description: 'Synthetic blueprint used for points field regression coverage.',
  examType: 'Admission',
  academicYear: '2026-2027',
  institution: 'PhilSA',
  examCategory: 'General Academic & Science',
  status: 'DRAFT',
  version: '1.0',
  owner: 'System Admin',
  createdAt: '2026-08-05T00:00:00Z',
  effectiveDate: '2026-08-05',
  expirationDate: '2027-08-05',
  sections: [
    {
      id: 'SEC-1',
      name: 'Section I: General Evaluation',
      subject: 'Science',
      topics: ['Orbital Mechanics'],
      competencies: ['Evaluate orbital parameters'],
      cognitiveLevels: {
        remembering: 1,
        understanding: 1,
        applying: 1,
        analyzing: 0,
        evaluating: 0,
        creating: 0,
      },
      itemCount: 3,
      marksPerItem: 5,
      totalMarks: 25,
      passingScore: 15,
      timeAllocation: 20,
      instructions: 'Answer all items carefully.',
      difficultyDistribution: {
        easy: 1,
        moderate: 1,
        difficult: 1,
      },
      itemTypeDistribution: {
        mcq: 2,
        tf: 1,
        essay: 0,
        fib: 0,
      },
    },
  ],
  rules: {
    totalItems: 3,
    totalMarks: 25,
    totalTimeLimit: 20,
    sharedStimulusRequirement: {
      required: false,
      minCount: 0,
      questionsPerStimulus: 0,
    },
    randomizationRules: {
      shuffleQuestions: true,
      shuffleChoices: true,
      fixedSequence: false,
    },
    maxReuseLimit: 3,
    versionCompatibility: '>= 1.0',
    activeItemOnly: true,
    accessibilityAccommodations: {
      screenReader: true,
      extendedTimeAllowance: true,
      highContrastMode: true,
      dyslexiaTypography: false,
      audioPrompts: false,
    },
  },
  history: [
    {
      id: 'H-1',
      version: '1.0',
      action: 'Created',
      updatedBy: 'System Admin',
      updatedAt: '2026-08-05T00:00:00Z',
      comments: 'Initial synthetic blueprint.',
    },
  ],
};

const blueprintReviewFixture = blueprintFixture as Blueprint & { createdByUserId?: string };

function renderPage() {
  return render(<ExamBlueprints />);
}

describe('ExamBlueprints points field', () => {
  beforeEach(() => {
    listBlueprints.mockReset();
    createBlueprint.mockReset();
    updateBlueprint.mockReset();
    cloneBlueprint.mockReset();
    deleteBlueprint.mockReset();
    transitionBlueprint.mockReset();
    navigateMock.mockReset();
    localStorage.clear();
  });

  it('renders the Points field between Item Count and Time and loads existing values', async () => {
    listBlueprints.mockResolvedValue({ ok: true, data: [blueprintFixture] });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const itemCountInput = screen.getByLabelText('Item Count (Questions)');
    const sectionGrid = itemCountInput.closest('div.grid') as HTMLElement;
    expect(sectionGrid).not.toBeNull();

    expect(within(sectionGrid).getByLabelText('Item Count (Questions)')).toHaveValue(3);
    expect(within(sectionGrid).getByLabelText('Points')).toHaveValue(25);
    expect(within(sectionGrid).getByLabelText('Time (Minutes)')).toHaveValue(20);
    expect(within(sectionGrid).getByLabelText('Points')).toHaveAttribute('min', '0');

    const itemLabel = within(sectionGrid).getByText('Item Count (Questions)');
    const pointsLabel = within(sectionGrid).getByText('Points');
    const timeLabel = within(sectionGrid).getByText('Time (Minutes)');

    expect(itemLabel.compareDocumentPosition(pointsLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pointsLabel.compareDocumentPosition(timeLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the overall Points metric in sync when a section point value changes and clamps negatives to zero', async () => {
    listBlueprints.mockResolvedValue({ ok: true, data: [blueprintFixture] });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const pointsInput = screen.getByLabelText('Points');
    await user.clear(pointsInput);
    await user.type(pointsInput, '40');

    await waitFor(() => expect(screen.getByText('40 points')).toBeInTheDocument());

    await user.clear(pointsInput);
    fireEvent.change(pointsInput, { target: { value: '-5' } });

    expect(pointsInput).toHaveValue(0);
    await waitFor(() => expect(screen.getByText('0 points')).toBeInTheDocument());
  });

  it('updates the overall Points metric when sections are added and removed', async () => {
    listBlueprints.mockResolvedValue({ ok: true, data: [blueprintFixture] });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    await waitFor(() => expect(screen.getByText('25 points')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add section block/i }));
    await waitFor(() => expect(screen.getByText('40 points')).toBeInTheDocument());

    const removeButtons = screen.getAllByTitle('Remove section block');
    await user.click(removeButtons[1]);

    await waitFor(() => expect(screen.getByText('25 points')).toBeInTheDocument());
  });

  it('submits the section Points value through the existing totalMarks API field', async () => {
    listBlueprints.mockResolvedValue({ ok: true, data: [blueprintFixture] });
    updateBlueprint.mockResolvedValue({ ok: true, data: blueprintFixture });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const pointsInput = screen.getByLabelText('Points');
    await user.clear(pointsInput);
    await user.type(pointsInput, '45');
    await user.click(screen.getByRole('button', { name: /save specification draft/i }));

    await waitFor(() => expect(updateBlueprint).toHaveBeenCalledTimes(1));
    const payload = updateBlueprint.mock.calls[0][0] as Blueprint;
    expect(payload.sections[0].totalMarks).toBe(45);
    expect(payload.rules.totalMarks).toBe(45);
  });

  it('submits a draft blueprint for review through the transition API', async () => {
    listBlueprints.mockResolvedValue({ ok: true, data: [blueprintFixture] });
    transitionBlueprint.mockResolvedValue({
      ok: true,
      data: { ...blueprintFixture, status: 'SUBMITTED' },
    });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByText('Exam Blueprint with Points'));
    await user.click(screen.getByRole('button', { name: /submit for review/i }));

    await waitFor(() => expect(transitionBlueprint).toHaveBeenCalledWith('BP-001', {
      status: 'SUBMITTED',
      remarks: 'Submitted for review.',
    }));
  });

  it('hides blueprint review buttons for the creator', async () => {
    listBlueprints.mockResolvedValue({
      ok: true,
      data: [{ ...blueprintReviewFixture, createdByUserId: currentUser.id, status: 'SUBMITTED' }],
    });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByText('Exam Blueprint with Points'));

    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /request correction/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
  });

  it('shows approve for submitted blueprints and can submit approval directly', async () => {
    listBlueprints.mockResolvedValue({
      ok: true,
      data: [{ ...blueprintReviewFixture, createdByUserId: 'another-user', status: 'SUBMITTED' }],
    });
    transitionBlueprint.mockResolvedValue({
      ok: true,
      data: { ...blueprintReviewFixture, createdByUserId: 'another-user', status: 'APPROVED' },
    });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByText('Exam Blueprint with Points'));

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request correction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /approve/i }));
    await user.click(screen.getByRole('button', { name: /confirm approve/i }));

    expect(transitionBlueprint).toHaveBeenCalledWith('BP-001', {
      status: 'APPROVED',
      remarks: '',
    });
  });

  it('allows approve from academic review', async () => {
    listBlueprints.mockResolvedValue({
      ok: true,
      data: [{ ...blueprintReviewFixture, createdByUserId: 'another-user', status: 'ACADEMIC_REVIEW' }],
    });
    transitionBlueprint.mockResolvedValue({
      ok: true,
      data: { ...blueprintReviewFixture, createdByUserId: 'another-user', status: 'APPROVED' },
    });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByText('Exam Blueprint with Points'));
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await user.click(screen.getByRole('button', { name: /confirm approve/i }));

    expect(transitionBlueprint).toHaveBeenCalledWith('BP-001', {
      status: 'APPROVED',
      remarks: '',
    });
  });

  it('sends rejected as the blueprint review action', async () => {
    listBlueprints.mockResolvedValue({
      ok: true,
      data: [{ ...blueprintReviewFixture, createdByUserId: 'another-user', status: 'SUBMITTED' }],
    });
    transitionBlueprint.mockResolvedValue({
      ok: true,
      data: { ...blueprintReviewFixture, createdByUserId: 'another-user', status: 'REJECTED' },
    });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByText('Exam Blueprint with Points'));
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await user.type(screen.getByLabelText(/remarks/i), 'Not aligned with the blueprint standard.');
    await user.click(screen.getByRole('button', { name: /confirm reject/i }));

    expect(transitionBlueprint).toHaveBeenCalledWith('BP-001', {
      status: 'REJECTED',
      remarks: 'Not aligned with the blueprint standard.',
    });
  });

  it('renders rejected as a blueprint status badge and filter option', async () => {
    listBlueprints.mockResolvedValue({
      ok: true,
      data: [{ ...blueprintReviewFixture, createdByUserId: 'another-user', status: 'REJECTED' }],
    });

    renderPage();
    const user = userEvent.setup();

    await screen.findByText('Exam Blueprint with Points');
    await user.click(screen.getByRole('button', { name: /filters/i }));

    expect(screen.getAllByText(/rejected/i)).not.toHaveLength(0);
    expect(screen.getByRole('option', { name: /rejected/i })).toBeInTheDocument();
  });
});
