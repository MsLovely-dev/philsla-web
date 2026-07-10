import { beforeEach, describe, expect, it } from 'vitest';
import type { Application, User } from '../types';
import { LocalStorageAuthService } from './authService';

const student: User = {
  id: 'student-1',
  email: 'student@example.com',
  firstName: 'Ana',
  lastName: 'Reyes',
  role: 'STUDENT',
};

const storedApplication: Application = {
  id: 'CAND-2026-0001',
  userId: 'student-application',
  status: 'PENDING',
  firstName: 'Jose',
  lastName: 'Santos',
  noMiddleName: true,
  dob: '2008-01-01',
  birthPlace: 'Manila',
  nationality: 'Filipino',
  gender: 'Male',
  email: 'application@example.com',
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

function createService() {
  return new LocalStorageAuthService({
    users: [student],
    storage: localStorage,
    delayMs: 0,
  });
}

describe('LocalStorageAuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads an existing prototype session from localStorage', async () => {
    localStorage.setItem('philsa_user', JSON.stringify(student));
    const service = createService();

    const result = await service.getCurrentSession();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.user.id).toBe(student.id);
    }
  });

  it('logs in a known mock user and stores the compatible session user', async () => {
    const service = createService();

    const result = await service.login({ email: student.email });

    expect(result.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('philsa_user') ?? '{}')).toMatchObject({
      id: student.id,
      email: student.email,
    });
  });

  it('can create a student session from a saved application email', async () => {
    localStorage.setItem('philsa_apps', JSON.stringify([storedApplication]));
    const service = createService();

    const result = await service.login({ email: storedApplication.email });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user).toMatchObject({
        id: storedApplication.userId,
        role: 'STUDENT',
        candidateId: storedApplication.id,
      });
    }
  });

  it('clears the stored session on logout', async () => {
    localStorage.setItem('philsa_user', JSON.stringify(student));
    const service = createService();

    await service.logout();

    expect(localStorage.getItem('philsa_user')).toBeNull();
  });
});
