import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExamPermitPage from './ExamPermitPage';

const currentUser = vi.hoisted(() => ({
  value: { id: 'admin-1', firstName: 'Backend', role: 'SYSTEM_ADMIN' as string },
}));

const backendMocks = vi.hoisted(() => ({
  getMyExamPermit: vi.fn(),
}));

const pdfExportMocks = vi.hoisted(() => ({
  createExamPermitPdf: vi.fn(),
  downloadBlob: vi.fn(),
  getExamPermitPdfFilename: vi.fn((candidateId: string) => `PhilSA-Exam-Permit-${candidateId}.pdf`),
}));

vi.mock('../PhilSAContext', () => ({
  usePhilSA: () => ({ user: currentUser.value }),
}));

vi.mock('../services/mockService', () => ({
  useMockData: () => ({ permits: [], schedules: [], proctors: [] }),
}));

vi.mock('../services/backendApplicationService', async () => {
  const actual = await vi.importActual<typeof import('../services/backendApplicationService')>(
    '../services/backendApplicationService',
  );
  return {
    ...actual,
    backendApplicationService: { getMyExamPermit: backendMocks.getMyExamPermit },
  };
});

vi.mock('../services/examPermitPdfExport', () => pdfExportMocks);

describe('ExamPermitPage (SYSTEM_ADMIN preview, mock mode)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'prototype');
    localStorage.clear();
    pdfExportMocks.createExamPermitPdf.mockReset();
    pdfExportMocks.downloadBlob.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the empty state with a preview hint when no slot has been confirmed yet', () => {
    render(<ExamPermitPage />);

    expect(screen.getByText(/no active permit/i)).toBeInTheDocument();
    expect(screen.getByText(/confirm an exam schedule to preview a permit here/i)).toBeInTheDocument();
  });

  it('shows a demo permit with a QR code once the Dashboard preview has confirmed a slot', () => {
    localStorage.setItem('philsa_admin_preview_slot_id', 'preview-slot-1');

    render(<ExamPermitPage />);

    expect(screen.getByText(/preview mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Benitez Hall R101/)).toBeInTheDocument();
    expect(screen.getByText(/08:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/11:00 AM/)).toBeInTheDocument();
    expect(screen.getByText('SAMPLE_QR_PHILSA_PREVIEW-2026-0001')).toBeInTheDocument();
  });

  it('downloads a PDF of the permit when the PDF button is clicked', async () => {
    const user = userEvent.setup();
    localStorage.setItem('philsa_admin_preview_slot_id', 'preview-slot-1');
    const fakeBlob = new Blob(['pdf-bytes']);
    pdfExportMocks.createExamPermitPdf.mockResolvedValue(fakeBlob);

    render(<ExamPermitPage />);

    await user.click(screen.getByRole('button', { name: /pdf/i }));

    expect(pdfExportMocks.createExamPermitPdf).toHaveBeenCalledWith(expect.any(HTMLElement));
    expect(pdfExportMocks.downloadBlob).toHaveBeenCalledWith(fakeBlob, 'PhilSA-Exam-Permit-PREVIEW-2026-0001.pdf');
  });
});

describe('ExamPermitPage (backend mode)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'backend');
    currentUser.value = { id: 'student-1', firstName: 'Jan', role: 'STUDENT' };
    backendMocks.getMyExamPermit.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the real permit with a real QR code once one has been issued', async () => {
    backendMocks.getMyExamPermit.mockResolvedValue({
      ok: true,
      data: {
        id: 'permit-1',
        candidateId: 'PHL-2026-ABC123',
        fullName: 'Jan Delacruz',
        email: 'jan@example.test',
        testCenter: 'University of the Philippines Diliman',
        room: 'Benitez Hall R101',
        seat: '1',
        examDate: '2026-06-15',
        startTime: '08:00:00',
        endTime: '11:00:00',
        qrCode: 'real-issued-token',
        status: 'ISSUED',
      },
    });

    render(<ExamPermitPage />);

    expect(await screen.findByText(/Benitez Hall R101/)).toBeInTheDocument();
    expect(screen.getByText('real-issued-token')).toBeInTheDocument();
    expect(screen.getByText(/08:00 AM/)).toBeInTheDocument();
    expect(screen.queryByText(/preview mode/i)).not.toBeInTheDocument();
  });

  it('shows the no-permit empty state for a real student with no permit yet', async () => {
    backendMocks.getMyExamPermit.mockResolvedValue({ ok: true, data: null });

    render(<ExamPermitPage />);

    expect(await screen.findByText(/no active permit/i)).toBeInTheDocument();
  });
});
