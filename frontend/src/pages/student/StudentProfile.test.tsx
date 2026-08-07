import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentProfile from './StudentProfile';

const serviceMocks = vi.hoisted(() => ({
  getStudentProfileCompletion: vi.fn(),
  saveStudentProfileDraft: vi.fn(),
  submitStudentProfile: vi.fn(),
  uploadStudentProfileAttachment: vi.fn(),
  uploadStudentProfileSelfie: vi.fn(),
  validateManualRegistrationSelfieFace: vi.fn(),
}));

vi.mock('../../services/backendApplicationService', () => ({
  backendApplicationService: serviceMocks,
}));

const profilePayload = {
  application: {
    id: 'application-id',
    candidateId: 'APP-2026-0001',
    status: 'SUBMITTED',
    personal: { firstName: 'Bulk', lastName: 'Student', email: 'student@example.test', mobile: '' },
    address: { region: 'NCR' },
    school: { lrn: '123456789012', name: 'Sample National High School', gradeLevel: 'Grade 12' },
    coursePreferences: [{ rank: 1, university: '', course: '' }],
    reviewStep: { privacyConsent: false, declarationAccepted: false },
    examCycleId: '2026',
    completionStatus: 'PENDING_STUDENT_COMPLETION',
    submissionSource: 'ADMISSIONS_BULK_UPLOAD',
    version: 1,
    submittedAt: '2026-07-14T00:00:00Z',
    createdAt: '2026-07-14T00:00:00Z',
    updatedAt: '2026-07-14T00:00:00Z',
  },
  fields: [
    { id: 1, section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Scholarship Certification', fieldSection: 'Supporting Documents', inputType: 'file', optionValues: [], priority: 'High Priority', status: true },
    { id: 2, section: 'Step 1 Registration', type: 'Student Registration Field', value: 'Student Category', fieldSection: 'Personal Information', inputType: 'dropdown', optionValues: ['STEM', 'Non-STEM'], priority: 'High Priority', status: true },
    { id: 3, section: 'Step 1 Registration', type: 'Student Registration Field', value: 'PWD', fieldSection: 'PWD Information', inputType: 'dropdown', optionValues: ['Yes', 'No'], priority: 'High Priority', status: true },
    { id: 4, section: 'Step 1 Registration', type: 'Student Registration Field', value: 'PWD Type', fieldSection: 'PWD Information', inputType: 'text', optionValues: [], priority: 'High Priority', status: true },
  ],
  progress: {
    completed: 10,
    total: 12,
    percent: 83,
    remaining: [
      { section: 'personal', fieldKey: 'mobile', label: 'Mobile Number', type: 'field', required: true },
      { section: 'Supporting Documents', fieldKey: 'Scholarship Certification', label: 'Scholarship Certification', type: 'file', required: true },
    ],
  },
};

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/student/profile']}>
      <Routes>
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/dashboard" element={<h1>Dashboard</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  serviceMocks.getStudentProfileCompletion.mockReset();
  serviceMocks.saveStudentProfileDraft.mockReset();
  serviceMocks.submitStudentProfile.mockReset();
  serviceMocks.uploadStudentProfileAttachment.mockReset();
  serviceMocks.uploadStudentProfileSelfie.mockReset();
  serviceMocks.validateManualRegistrationSelfieFace.mockReset();
  serviceMocks.getStudentProfileCompletion.mockResolvedValue({ ok: true, data: profilePayload });
  serviceMocks.saveStudentProfileDraft.mockResolvedValue({
    ok: true,
    data: { ...profilePayload, application: { ...profilePayload.application, version: 2 } },
  });
  serviceMocks.submitStudentProfile.mockResolvedValue({
    ok: true,
    data: { ...profilePayload, application: { ...profilePayload.application, version: 3, completionStatus: 'COMPLETE' }, progress: { completed: 12, total: 12, percent: 100, remaining: [] } },
  });
  serviceMocks.uploadStudentProfileAttachment.mockResolvedValue({
    ok: true,
    data: { id: 'attachment-id', section: 'Supporting Documents', fieldKey: 'Scholarship Certification', filename: 'cert.pdf', contentType: 'application/pdf', size: 8 },
  });
  serviceMocks.uploadStudentProfileSelfie.mockResolvedValue({
    ok: true,
    data: { uploadedMedia: ['SELFIE'], results: {}, progress: { completed: 11, total: 12, percent: 92, remaining: [] } },
  });
  serviceMocks.validateManualRegistrationSelfieFace.mockResolvedValue({
    ok: true,
    data: { faceDetected: true, faceCount: 1, confidence: 99, boundingBox: { x: 1, y: 1, width: 20, height: 20 }, faceCovered: false },
  });
});

describe('StudentProfile', () => {
  it('loads pending profile requirements and saves a draft', async () => {
    const user = userEvent.setup();
    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Profile Completion' })).toBeInTheDocument();
    expect(screen.getByText(/APP-2026-0001/)).toBeInTheDocument();
    expect(screen.getByText('10/12 completed')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Mobile Number'), '09171234567');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(serviceMocks.saveStudentProfileDraft).toHaveBeenCalled());
    expect(serviceMocks.saveStudentProfileDraft).toHaveBeenCalledWith(expect.objectContaining({
      version: 1,
      personal: expect.objectContaining({ mobile: '09171234567' }),
    }));
  });

  it('uploads configured file requirements', async () => {
    const user = userEvent.setup();
    renderProfile();

    const file = new File(['%PDF-1.4'], 'cert.pdf', { type: 'application/pdf' });
    await user.upload(await screen.findByLabelText('Upload Scholarship Certification'), file);

    expect(serviceMocks.uploadStudentProfileAttachment).toHaveBeenCalledWith('Scholarship Certification', file);
    await waitFor(() => expect(serviceMocks.getStudentProfileCompletion).toHaveBeenCalledTimes(2));
  });

  it('uploads the required profile selfie', async () => {
    const user = userEvent.setup();
    const track = { stop: vi.fn() };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }) },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
    renderProfile();

    expect(screen.queryByText('Live Camera Preview')).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /open capture/i }));
    expect(await screen.findByRole('dialog', { name: /biometric selfie capture/i })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /start camera/i }));
    await user.click(await screen.findByRole('button', { name: /capture selfie/i }));

    expect(serviceMocks.validateManualRegistrationSelfieFace).toHaveBeenCalledWith(expect.any(File));
    expect(serviceMocks.uploadStudentProfileSelfie).toHaveBeenCalledWith(expect.any(File));
    await waitFor(() => expect(serviceMocks.getStudentProfileCompletion).toHaveBeenCalledTimes(2));
  });

  it('hides dependent PWD fields when the student is not PWD', async () => {
    renderProfile();

    expect(await screen.findByLabelText('PWD')).toBeInTheDocument();
    expect(screen.queryByLabelText('PWD Type')).not.toBeInTheDocument();
  });

  it('saves then submits the completed profile', async () => {
    const user = userEvent.setup();
    renderProfile();

    await screen.findByRole('heading', { name: 'Profile Completion' });
    await user.click(screen.getByRole('button', { name: /submit profile/i }));

    await waitFor(() => expect(serviceMocks.submitStudentProfile).toHaveBeenCalledWith(2));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });
});
