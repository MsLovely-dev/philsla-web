import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendApplicationService, createBackendApplicationDraftInput } from './backendApplicationService';

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

describe('BackendApplicationService', () => {
  it('calls the public LRN verification endpoint with LRN and date of birth', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          verificationToken: 'verification-token',
          expiresInSeconds: 900,
          profile: {
            lrn: '123456789012',
            firstName: 'Sample',
            middleName: 'Test',
            lastName: 'Learner',
            dateOfBirth: '2008-05-15',
            schoolName: 'Sample National High School',
            gradeLevel: 'Grade 12',
          },
        },
        { status: 200 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.verifyLrn('123456789012', '2008-05-15');

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/registration/lrn/verify/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ lrn: '123456789012', dateOfBirth: '2008-05-15' }),
      }),
    );
  });

  it('creates and submits a public registration through the token-protected create endpoint', async () => {
    const submitted = {
      id: 'application-id',
      status: 'SUBMITTED',
      personal: {},
      address: {},
      school: {},
      coursePreferences: [],
      reviewStep: {},
      examCycleId: '2026',
      version: 2,
      submittedAt: '2026-07-14T00:01:00Z',
      createdAt: '2026-07-14T00:00:00Z',
      updatedAt: '2026-07-14T00:00:00Z',
    };
    const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse(submitted, { status: 201 }));
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.createAndSubmit({
      verificationToken: 'verification-token',
      password: 'Password1!',
      personal: {},
      address: {},
      school: {},
      coursePreferences: [],
      reviewStep: {},
    });

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          verificationToken: 'verification-token',
          password: 'Password1!',
          personal: {},
          address: {},
          school: {},
          coursePreferences: [],
          reviewStep: {},
          submitOnCreate: true,
        }),
      }),
    );
  });

  it('loads the protected admissions review queue', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        [
          {
            id: 'application-id',
            status: 'SUBMITTED',
            personal: { firstName: 'Sample', lastName: 'Learner' },
            address: {},
            school: {},
            coursePreferences: [],
            reviewStep: {},
            examCycleId: '2026',
            version: 2,
            submittedAt: '2026-07-14T00:01:00Z',
            createdAt: '2026-07-14T00:00:00Z',
            updatedAt: '2026-07-14T00:01:00Z',
          },
        ],
        { status: 200 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.listReviewQueue();

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/review-queue/',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('submits an admissions reviewer decision for an application', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          id: 'application-id',
          status: 'APPROVED',
          personal: {},
          address: {},
          school: {},
          coursePreferences: [],
          reviewStep: { reviewerDecision: 'APPROVE' },
          examCycleId: '2026',
          version: 3,
          submittedAt: '2026-07-14T00:01:00Z',
          createdAt: '2026-07-14T00:00:00Z',
          updatedAt: '2026-07-14T00:02:00Z',
        },
        { status: 200 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.decideApplication('application-id', 'APPROVE', { reason: 'Verified.' });

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/application-id/review-decision/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          decision: 'APPROVE',
          reason: 'Verified.',
          requiredCorrections: [],
        }),
      }),
    );
  });

  it('maps the registration form into the backend draft payload', () => {
    const payload = createBackendApplicationDraftInput('token', {
      firstName: 'Sample',
      middleName: 'Test',
      noMiddleName: false,
      lastName: 'Learner',
      suffix: '',
      dob: '2008-05-15',
      email: 'student@example.test',
      password: 'Password1!',
      mobile: '09171234567',
      region: 'NCR',
      province: 'Metro Manila',
      city: 'Quezon City',
      barangay: 'Diliman',
      street: 'Agham Road',
      zipCode: '1101',
      lrn: '123456789012',
      schoolName: 'Sample National High School',
      schoolAddress: 'Quezon City',
      academicTrack: 'STEM',
      gradeLevel: 'Grade 12',
      gwa: '94',
      universities: ['UP Diliman'],
      courses: ['BS Computer Science'],
      photoUrl: 'student-id.png',
      selfieUrl: 'selfie.png',
    });

    expect(payload).toMatchObject({
      verificationToken: 'token',
      password: 'Password1!',
      personal: {
        firstName: 'Sample',
        dateOfBirth: '2008-05-15',
        studentIdPhotoUrl: 'student-id.png',
        selfiePhotoUrl: 'selfie.png',
      },
      address: {
        postalCode: '1101',
      },
      school: {
        lrn: '123456789012',
        name: 'Sample National High School',
      },
      coursePreferences: [{ rank: 1, university: 'UP Diliman', course: 'BS Computer Science' }],
      reviewStep: {
        privacyConsent: true,
        declarationAccepted: true,
      },
    });
  });
});
