import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewerApplicationDetail from './ReviewerApplicationDetail';

const backendMocks = vi.hoisted(() => ({
  getApplication: vi.fn(),
  getApplicationPhoto: vi.fn(),
}));

vi.mock('../../PhilSAContext', () => ({
  usePhilSA: () => ({
    user: {
      id: 'reviewer-id',
      email: 'reviewer@example.test',
      firstName: 'Review',
      lastName: 'User',
    },
    addAuditLog: vi.fn(),
  }),
}));

vi.mock('../../services/backendApplicationService', () => ({
  backendApplicationService: {
    getApplication: backendMocks.getApplication,
    getApplicationPhoto: backendMocks.getApplicationPhoto,
  },
  mapBackendApplicationsToReviewRows: () => [
    {
      id: 'application-id',
      candidateId: 'PS-2026-TEST-0001',
      userId: 'application-id',
      status: 'PENDING',
      submittedAt: '2026-08-05T08:00:00Z',
      firstName: 'Lovely',
      middleName: 'Mae',
      noMiddleName: false,
      lastName: 'Chavez',
      suffix: '',
      dob: '2008-05-15',
      birthPlace: '',
      nationality: 'Filipino',
      gender: 'Female',
      email: 'lovely@example.test',
      mobile: '09123456789',
      nationalId: '',
      region: '',
      province: '',
      city: '',
      barangay: '',
      street: '',
      zipCode: '',
      lrn: '123456789012',
      schoolId: '301234',
      schoolName: 'Sample School',
      schoolAddress: '',
      academicTrack: 'STEM',
      gradeLevel: 'Grade 12',
      enrollmentStatus: 'Enrolled',
      schoolYear: '2026-2027',
      gwa: 94,
      universities: [],
      courses: [],
      examScheduleId: '',
      center: '',
      risk: 'LOW',
      duplicateScore: 0,
      duplicateStatus: 'No Match',
      photoUrl: 'http://localhost:8000/api/v1/applications/application-id/identity-media/SELFIE/',
      history: [{ status: 'SUBMITTED', date: '8/5/2026, 4:00:00 PM', actor: 'System' }],
      additionalHighPriorityFields: {},
    },
  ],
}));

describe('ReviewerApplicationDetail', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_SERVICE_MODE', 'backend');
    backendMocks.getApplication.mockReset();
    backendMocks.getApplicationPhoto.mockReset();
  });

  it('waits for the authenticated selfie blob before rendering the applicant photo', async () => {
    backendMocks.getApplication.mockResolvedValue({
      ok: true,
      data: {
        id: 'application-id',
        status: 'SUBMITTED',
        personal: {},
        address: {},
        school: {},
        coursePreferences: [],
        reviewStep: {},
        photoUrl: 'http://localhost:8000/api/v1/applications/application-id/identity-media/SELFIE/',
        examCycleId: '2026',
        version: 1,
        submittedAt: '2026-08-05T08:00:00Z',
        createdAt: '2026-08-05T08:00:00Z',
        updatedAt: '2026-08-05T08:00:00Z',
      },
    });
    backendMocks.getApplicationPhoto.mockReturnValue(new Promise(() => undefined));

    render(
      <MemoryRouter initialEntries={['/admin/reviewer/applications/application-id']}>
        <Routes>
          <Route path="/admin/reviewer/applications/:id" element={<ReviewerApplicationDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Lovely Chavez')).toBeInTheDocument());

    expect(screen.queryByRole('img', { name: /lovely chavez applicant photo/i })).not.toBeInTheDocument();
  });
});
