import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewApplications from './ReviewApplications';

const serviceMocks = vi.hoisted(() => ({
  listReviewQueue: vi.fn(),
  getApplicationPhoto: vi.fn(),
  downloadBulkUploadTemplate: vi.fn(),
  validateBulkUploadCsv: vi.fn(),
  downloadBulkUploadErrors: vi.fn(),
  confirmBulkUpload: vi.fn(),
  decideApplication: vi.fn(),
}));

vi.mock('../../services/applicationReviewExportService', () => ({
  buildApplicationReviewExportRows: vi.fn(() => []),
  exportApplicationReviewBatch: vi.fn(),
}));

vi.mock('../../services/backendApplicationService', () => ({
  backendApplicationService: serviceMocks,
  mapBackendApplicationsToReviewRows: (applications: unknown[]) => applications,
}));

const reviewRow = {
  id: 'application-id',
  candidateId: 'PHL-2026-ABC123',
  status: 'PENDING',
  completionStatus: 'COMPLETE',
  firstName: 'Bulk',
  lastName: 'Learner',
  mobile: '09171234567',
  schoolName: 'Sample School',
  schoolId: '301234',
  universities: ['UP Diliman'],
  courses: ['BS Physics'],
  duplicateScore: 0,
  photoUrl: '',
};

function renderPage() {
  render(
    <MemoryRouter>
      <ReviewApplications />
    </MemoryRouter>,
  );
}

describe('ReviewApplications bulk upload', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'backend');
    Object.values(serviceMocks).forEach(mock => mock.mockReset());
    serviceMocks.listReviewQueue.mockResolvedValue({ ok: true, data: [reviewRow] });
    serviceMocks.downloadBulkUploadTemplate.mockResolvedValue({ ok: true, data: new Blob(['template']) });
    serviceMocks.downloadBulkUploadErrors.mockResolvedValue({ ok: true, data: new Blob(['errors']) });
    serviceMocks.confirmBulkUpload.mockResolvedValue({
      ok: true,
      data: { batchId: 'batch-id', status: 'COMPLETED', totalRows: 1, validRows: 1, failedRows: 0, conflictRows: 0, fieldErrorRows: 0, importedRows: 1, rejectedRows: 0, canConfirm: false },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:bulk-upload');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('shows the bulk upload action to admissions reviewers', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /bulk upload/i })).toBeInTheDocument();
  });

  it('downloads the CSV template from the backend service', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /bulk upload/i }));
    await user.click(screen.getByRole('button', { name: /download template/i }));

    expect(serviceMocks.downloadBulkUploadTemplate).toHaveBeenCalledTimes(1);
  });

  it('renders validation counts and row errors', async () => {
    const user = userEvent.setup();
    serviceMocks.validateBulkUploadCsv.mockResolvedValue({
      ok: true,
      data: {
        batchId: 'batch-id',
        status: 'VALIDATED',
        totalRows: 2,
        validRows: 1,
        failedRows: 1,
        conflictRows: 0,
        fieldErrorRows: 1,
        canConfirm: true,
        rows: [
          { rowNumber: 3, status: 'FIELD_ERROR', applicationId: null, errors: [{ field: 'firstName', code: 'required', reason: 'This field is required.' }] },
        ],
      },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /bulk upload/i }));
    await user.upload(screen.getByLabelText(/csv file/i), new File(['csv'], 'students.csv', { type: 'text/csv' }));
    await user.click(screen.getByRole('button', { name: /^validate$/i }));

    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(screen.getByText('firstName')).toBeInTheDocument();
    expect(screen.getByText('required')).toBeInTheDocument();
  });

  it('disables confirm import when there are no valid rows', async () => {
    const user = userEvent.setup();
    serviceMocks.validateBulkUploadCsv.mockResolvedValue({
      ok: true,
      data: { batchId: 'batch-id', status: 'VALIDATED', totalRows: 1, validRows: 0, failedRows: 1, conflictRows: 0, fieldErrorRows: 1, canConfirm: false, rows: [] },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /bulk upload/i }));
    await user.upload(screen.getByLabelText(/csv file/i), new File(['csv'], 'students.csv', { type: 'text/csv' }));
    await user.click(screen.getByRole('button', { name: /^validate$/i }));

    expect(await screen.findByRole('button', { name: /confirm import/i })).toBeDisabled();
  });

  it('shows a readable message when the backend cannot parse the CSV', async () => {
    const user = userEvent.setup();
    serviceMocks.validateBulkUploadCsv.mockResolvedValue({
      ok: true,
      data: { batchId: 'batch-id', status: 'FAILED', totalRows: 0, validRows: 0, failedRows: 0, conflictRows: 0, fieldErrorRows: 0, canConfirm: false, rows: [] },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /bulk upload/i }));
    await user.upload(screen.getByLabelText(/csv file/i), new File(['csv'], 'students.csv', { type: 'text/csv' }));
    await user.click(screen.getByRole('button', { name: /^validate$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/csv could not be read/i);
  });

  it('refreshes the review queue after successful confirmation', async () => {
    const user = userEvent.setup();
    serviceMocks.validateBulkUploadCsv.mockResolvedValue({
      ok: true,
      data: { batchId: 'batch-id', status: 'VALIDATED', totalRows: 1, validRows: 1, failedRows: 0, conflictRows: 0, fieldErrorRows: 0, canConfirm: true, rows: [] },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /bulk upload/i }));
    await user.upload(screen.getByLabelText(/csv file/i), new File(['csv'], 'students.csv', { type: 'text/csv' }));
    await user.click(screen.getByRole('button', { name: /^validate$/i }));
    await user.click(await screen.findByRole('button', { name: /confirm import/i }));

    await waitFor(() => expect(serviceMocks.confirmBulkUpload).toHaveBeenCalledWith('batch-id'));
    expect(serviceMocks.listReviewQueue).toHaveBeenCalled();
  });

  it('passes the pending student completion filter to the review queue service', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /pending student completion/i }));

    await waitFor(() => {
      expect(serviceMocks.listReviewQueue).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING_STUDENT_COMPLETION' }),
      );
    });
  });

  it('does not show approval action for pending-completion applications', async () => {
    serviceMocks.listReviewQueue.mockResolvedValue({
      ok: true,
      data: [{ ...reviewRow, completionStatus: 'PENDING_STUDENT_COMPLETION' }],
    });

    renderPage();

    await screen.findByText('Bulk Learner');

    expect(screen.queryByTitle('Approve Application')).not.toBeInTheDocument();
  });
});
