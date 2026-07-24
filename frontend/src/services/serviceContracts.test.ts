import { describe, expect, it } from 'vitest';
import type { Application, User } from '../types';
import { MockApplicationService, MockAuthService, MockReviewerService } from './mockServices';
import { networkError, validationError } from './serviceResult';

const student: User = {
  id: 'student-1',
  email: 'student@example.com',
  firstName: 'Ana',
  lastName: 'Reyes',
  role: 'STUDENT',
};

const reviewer: User = {
  id: 'reviewer-1',
  email: 'reviewer@example.com',
  firstName: 'Ramon',
  lastName: 'Santos',
  role: 'ADMISSIONS_REVIEWER',
};

const application: Application = {
  id: 'CAND-2026-0001',
  userId: student.id,
  status: 'PENDING',
  firstName: student.firstName,
  lastName: student.lastName,
  noMiddleName: true,
  dob: '2008-01-01',
  birthPlace: 'Manila',
  nationality: 'Filipino',
  gender: 'Female',
  email: student.email,
  mobile: '09171234567',
  nationalId: '1234-5678-9012',
  region: 'NCR',
  province: 'Metro Manila',
  city: 'Manila',
  barangay: 'Barangay 1',
  street: 'Rizal Street',
  zipCode: '1000',
  lrn: '123456789012',
  schoolName: 'Manila Science High School',
  schoolAddress: 'Manila',
  academicTrack: 'STEM',
  gradeLevel: 'Grade 12',
  gwa: 94,
  universities: ['UP Diliman'],
  courses: ['BS Computer Science'],
  examScheduleId: '',
};

describe('service response helpers', () => {
  it('returns consistent validation and network failures', () => {
    expect(validationError('Invalid input').error).toMatchObject({
      kind: 'VALIDATION',
      status: 422,
      retryable: false,
    });

    expect(networkError().error).toMatchObject({
      kind: 'NETWORK',
      retryable: true,
    });
  });
});

describe('mock service contracts', () => {
  it('returns an auth session for a known prototype user', async () => {
    const service = new MockAuthService({ users: [student] });

    const result = await service.login({ email: student.email });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.id).toBe(student.id);
    }
  });

  it('returns an authorization error for an unknown prototype user', async () => {
    const service = new MockAuthService({ users: [] });

    const result = await service.login({ email: 'missing@example.com' });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.kind).toBe('AUTHORIZATION');
    }
  });

  it('lists applications with pagination metadata', async () => {
    const service = new MockApplicationService({ applications: [application] });

    const result = await service.listApplications({ page: 1, pageSize: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, pageSize: 10, total: 1 });
    }
  });

  it('maps reviewer decisions to application status updates', async () => {
    const applicationService = new MockApplicationService({ applications: [application] });
    const reviewerService = new MockReviewerService({
      applicationService,
      schedules: [],
    });

    const result = await reviewerService.decideApplication({
      applicationId: application.id,
      reviewerId: reviewer.id,
      decision: 'REQUEST_CORRECTION',
      reason: 'Grade record is unreadable.',
      requiredCorrections: ['gradeRecordsUrl'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('FOR_CORRECTION');
      expect(result.data.requiredCorrections).toEqual(['gradeRecordsUrl']);
    }
  });
});
