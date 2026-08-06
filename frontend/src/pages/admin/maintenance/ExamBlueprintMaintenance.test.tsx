import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ExamBlueprintMaintenance from './ExamBlueprintMaintenance';
import { examBlueprintMaintenanceService } from '../../../services/backendExamBlueprintMaintenanceService';

function catalogRecord(overrides: Partial<{ id: string; code: string; name: string }> = {}) {
  return {
    id: '1',
    code: 'SCI',
    name: 'Science',
    description: '',
    isActive: true,
    createdAt: '2026-08-06T00:00:00Z',
    updatedAt: '2026-08-06T00:00:00Z',
    ...overrides,
  };
}

describe('ExamBlueprintMaintenance', () => {
  beforeEach(() => {
    vi.spyOn(examBlueprintMaintenanceService, 'listSubjects').mockResolvedValue({ ok: true, data: [] });
    vi.spyOn(examBlueprintMaintenanceService, 'listQuestionTypes').mockResolvedValue({ ok: true, data: [] });
    vi.spyOn(examBlueprintMaintenanceService, 'listTopics').mockResolvedValue({ ok: true, data: [] });
  });

  it('shows a loading state while subjects are being fetched', () => {
    vi.mocked(examBlueprintMaintenanceService.listSubjects).mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('shows backend subject data once loaded', async () => {
    vi.mocked(examBlueprintMaintenanceService.listSubjects).mockResolvedValue({
      ok: true,
      data: [catalogRecord()],
    });
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Science')).toBeInTheDocument());
  });

  it('shows a retryable error state on an initial load failure', async () => {
    vi.mocked(examBlueprintMaintenanceService.listSubjects).mockResolvedValue({
      ok: false,
      error: { kind: 'UNKNOWN', status: 500, code: 'SERVER_ERROR', message: 'Synthetic failure.' },
    });
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Synthetic failure.'));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('creates a subject through the service and renders the persisted response', async () => {
    const created = catalogRecord({ id: '2', code: 'MATH', name: 'Mathematics' });
    vi.spyOn(examBlueprintMaintenanceService, 'createSubject').mockResolvedValue({
      ok: true,
      data: created,
    });
    // The component reloads from the server after a successful mutation (single source of
    // truth), so the post-create listSubjects() call must reflect the persisted record.
    vi.mocked(examBlueprintMaintenanceService.listSubjects)
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValue({ ok: true, data: [created] });
    const user = userEvent.setup();
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /create new entry/i }));
    await user.type(screen.getByPlaceholderText(/code/i), 'MATH');
    await user.type(screen.getByPlaceholderText(/subject name/i), 'Mathematics');
    await user.click(screen.getByRole('button', { name: /submit entry/i }));

    await waitFor(() => expect(screen.getByText('Mathematics')).toBeInTheDocument());
    expect(examBlueprintMaintenanceService.createSubject).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MATH', name: 'Mathematics' }),
    );
  });

  it('shows a Subject dropdown populated from loaded subjects when switching to the Topics tab', async () => {
    vi.mocked(examBlueprintMaintenanceService.listSubjects).mockResolvedValue({
      ok: true,
      data: [catalogRecord()],
    });
    const user = userEvent.setup();
    render(<MemoryRouter><ExamBlueprintMaintenance /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Topics' }));
    await user.click(screen.getByRole('button', { name: /create new entry/i }));

    expect(screen.getByRole('option', { name: 'Science' })).toBeInTheDocument();
  });
});
