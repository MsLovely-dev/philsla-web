import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendApplicationService, createBackendApplicationDraftInput, mapBackendApplicationToFrontend } from './backendApplicationService';

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
  it('calls the public LRN verification endpoint with LRN and selected registered information', async () => {
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

    const result = await service.verifyLrn('123456789012', { category: 'email', value: 'student@example.test' });

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/registration/lrn/verify/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          lrn: '123456789012',
          verificationCategory: 'email',
          verificationValue: 'student@example.test',
        }),
      }),
    );
  });

  it('requests a registration email OTP through the backend', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          email: 'student@example.test',
          expiresInSeconds: 300,
          resendCooldownSeconds: 60,
        },
        { status: 200 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.requestRegistrationEmailOtp('student@example.test', { registrationSessionId: 'REG-SESSION-OTP' });

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/registration/email-otp/request/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Registration-Session-Id': 'REG-SESSION-OTP' }),
        body: JSON.stringify({ email: 'student@example.test' }),
      }),
    );
  });

  it('verifies a registration email OTP through the backend', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          email: 'student@example.test',
          verified: true,
          emailVerificationToken: 'email-verification-token',
          expiresInSeconds: 600,
        },
        { status: 200 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.verifyRegistrationEmailOtp('student@example.test', '123456', { registrationSessionId: 'REG-SESSION-OTP' });

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/registration/email-otp/verify/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Registration-Session-Id': 'REG-SESSION-OTP' }),
        body: JSON.stringify({ email: 'student@example.test', code: '123456' }),
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
      emailVerificationToken: 'email-verification-token',
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
          emailVerificationToken: 'email-verification-token',
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

  it('validates a selfie frame through the token-protected face validation endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          faceDetected: true,
          faceCount: 1,
          confidence: 92,
          boundingBox: { x: 10, y: 12, width: 100, height: 100 },
          faceCovered: false,
        },
        { status: 200 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));
    const frame = new File(['frame'], 'frame.jpg', { type: 'image/jpeg' });

    const result = await service.validateRegistrationSelfieFace('verification-token', frame);

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/registration/identity/selfie-face/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Registration-Token': 'verification-token' }),
        body: expect.any(FormData),
      }),
    );
  });

  it('validates a manual selfie frame through the public face validation endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          faceDetected: true,
          faceCount: 1,
          confidence: 92,
          boundingBox: { x: 10, y: 12, width: 100, height: 100 },
          faceCovered: false,
        },
        { status: 200 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));
    const frame = new File(['frame'], 'manual-frame.jpg', { type: 'image/jpeg' });

    const result = await service.validateManualRegistrationSelfieFace(frame);

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/registration/identity/manual-selfie-face/',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
  });

  it('surfaces selfie frame field validation errors', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid input.',
            fields: {
              file: ['No frontal face was detected in the selfie.'],
            },
          },
        },
        { status: 400 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));
    const frame = new File(['frame'], 'frame.jpg', { type: 'image/jpeg' });

    const result = await service.validateRegistrationSelfieFace('verification-token', frame);

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.message).toBe('No frontal face was detected in the selfie.');
      expect(result.error.fieldErrors?.file).toEqual(['No frontal face was detected in the selfie.']);
    }
  });

  it('uploads the enrolled selfie through the Step 1 identity endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          id: 'verification-id',
          status: 'PASSED',
          attempts: 1,
          configuration: {},
          uploadedMedia: ['SELFIE'],
          results: {},
        },
        { status: 200 },
      ),
    );
    const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));
    const selfie = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' });

    const result = await service.uploadRegistrationSelfie('verification-token', selfie);

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend.test/api/v1/applications/registration/identity/selfie/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Registration-Token': 'verification-token' }),
        body: expect.any(FormData),
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
    const payload = createBackendApplicationDraftInput('token', 'email-token', {
      firstName: 'Sample',
      middleName: 'Test',
      noMiddleName: false,
      lastName: 'Learner',
      suffix: '',
      dob: '2008-05-15',
      email: 'student@example.test',
      password: 'Password1!',
      mobile: '09171234567',
      gender: 'Female',
      region: 'NCR',
      province: 'Metro Manila',
      city: 'Quezon City',
      barangay: 'Diliman',
      street: 'Agham Road',
      zipCode: '1101',
      lrn: '123456789012',
      schoolId: '301234',
      schoolName: 'Sample National High School',
      schoolAddress: 'Quezon City',
      academicTrack: 'STEM',
      gradeLevel: 'Grade 12',
      enrollmentStatus: 'Enrolled',
      schoolYear: '2026-2027',
      gwa: '94',
      universities: ['UP Diliman'],
      courses: ['BS Computer Science'],
      selfiePhotoUrl: 'data:image/jpeg;base64,captured-selfie',
    });

    expect(payload).toMatchObject({
      verificationToken: 'token',
      emailVerificationToken: 'email-token',
      password: 'Password1!',
      personal: {
        firstName: 'Sample',
        dateOfBirth: '2008-05-15',
        selfiePhotoUrl: 'data:image/jpeg;base64,captured-selfie',
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

  it('maps backend registration entries into reviewer-facing application fields', () => {
    const application = mapBackendApplicationToFrontend({
      id: 'application-id',
      status: 'SUBMITTED',
      personal: {
        firstName: 'Lovely',
        middleName: 'Mae',
        lastName: 'Chavez',
        dateOfBirth: '2026-07-21',
        sex: 'Female',
        email: 'student@example.test',
        mobile: '09123456789',
        birthPlace: 'Cavite',
        additionalHighPriorityFields: {
          isPwd: 'Yes',
          pwdType: 'Visual Disability',
          pwdAccommodation: 'Large-print questionnaire',
          strand: 'STEM',
        },
      },
      address: {
        region: 'Region IV-A',
        postalCode: '4100',
      },
      school: {
        lrn: '123456789012',
        schoolId: '301234',
        name: 'UB',
        address: 'Batangas City',
        academicTrack: 'Academic',
        gradeLevel: 'Grade 12',
        enrollmentStatus: 'Enrolled',
        schoolYear: '2026-2027',
        gwa: '94',
      },
      coursePreferences: [
        { rank: 2, universityName: 'Second University', programName: 'BS Physics' },
        { rank: 1, university: 'First University', course: 'BS Astronomy' },
      ],
      reviewStep: {},
      photoUrl: 'selfie-url',
      examCycleId: 'cycle-id',
      version: 1,
      submittedAt: '2026-07-14T00:01:00Z',
      createdAt: '2026-07-14T00:00:00Z',
      updatedAt: '2026-07-14T00:01:00Z',
      lrnProfile: {
        firstName: '',
        middleName: '',
        lastName: '',
        schoolName: '',
      },
    }, 'user-id');

    expect(application).toMatchObject({
      id: 'application-id',
      status: 'PENDING',
      firstName: 'Lovely',
      middleName: 'Mae',
      lastName: 'Chavez',
      birthPlace: 'Cavite',
      photoUrl: 'selfie-url',
      schoolId: '301234',
      schoolName: 'UB',
      schoolAddress: 'Batangas City',
      enrollmentStatus: 'Enrolled',
      schoolYear: '2026-2027',
      gwa: 94,
      universities: ['First University', 'Second University'],
      courses: ['BS Astronomy', 'BS Physics'],
      additionalHighPriorityFields: {
        isPwd: 'Yes',
        pwdType: 'Visual Disability',
        pwdAccommodation: 'Large-print questionnaire',
        strand: 'STEM',
      },
    });
  });
});
