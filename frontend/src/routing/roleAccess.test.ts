import { describe, expect, it } from 'vitest';
import { User } from '../types';
import { canAccessMaintenanceHub, canAccessStudentRegistrationMaintenance } from './roleAccess';

function user(overrides: Partial<User>): User {
  return {
    id: 'u1',
    email: 'u1@example.test',
    firstName: 'Test',
    lastName: 'User',
    role: 'STUDENT',
    ...overrides,
  };
}

describe('canAccessStudentRegistrationMaintenance', () => {
  it('allows System Admin', () => {
    expect(canAccessStudentRegistrationMaintenance(user({ role: 'SYSTEM_ADMIN', backendRole: 'SYSTEM_ADMIN' }))).toBe(true);
  });

  it('allows DepEd Admin via the exact backend role', () => {
    expect(canAccessStudentRegistrationMaintenance(user({ role: 'GOVERNMENT', backendRole: 'DEPED_ADMIN' }))).toBe(true);
  });

  it('denies University Admin', () => {
    expect(canAccessStudentRegistrationMaintenance(user({ role: 'UNIVERSITY_ADMIN' }))).toBe(false);
  });

  it('denies Admissions Reviewer', () => {
    expect(canAccessStudentRegistrationMaintenance(user({ role: 'ADMISSIONS_REVIEWER' }))).toBe(false);
  });

  it('denies CHED Admin despite sharing the GOVERNMENT display role', () => {
    expect(canAccessStudentRegistrationMaintenance(user({ role: 'GOVERNMENT', backendRole: 'CHED_ADMIN' }))).toBe(false);
  });

  it('denies TESDA Admin despite sharing the GOVERNMENT display role', () => {
    expect(canAccessStudentRegistrationMaintenance(user({ role: 'GOVERNMENT', backendRole: 'TESDA_ADMIN' }))).toBe(false);
  });

  it('denies the GOVERNMENT display role when no exact backend role was retained', () => {
    expect(canAccessStudentRegistrationMaintenance(user({ role: 'GOVERNMENT' }))).toBe(false);
  });
});

describe('canAccessMaintenanceHub', () => {
  it('allows every existing Maintenance Hub role', () => {
    for (const role of ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER', 'EXAM_ADMINISTRATOR', 'PROCTOR', 'PROCTOR_ADMIN'] as const) {
      expect(canAccessMaintenanceHub(user({ role }))).toBe(true);
    }
  });

  it('allows DepEd Admin via the exact backend role', () => {
    expect(canAccessMaintenanceHub(user({ role: 'GOVERNMENT', backendRole: 'DEPED_ADMIN' }))).toBe(true);
  });

  it('denies CHED Admin despite sharing the GOVERNMENT display role', () => {
    expect(canAccessMaintenanceHub(user({ role: 'GOVERNMENT', backendRole: 'CHED_ADMIN' }))).toBe(false);
  });

  it('denies TESDA Admin despite sharing the GOVERNMENT display role', () => {
    expect(canAccessMaintenanceHub(user({ role: 'GOVERNMENT', backendRole: 'TESDA_ADMIN' }))).toBe(false);
  });

  it('denies the GOVERNMENT display role when no exact backend role was retained', () => {
    expect(canAccessMaintenanceHub(user({ role: 'GOVERNMENT' }))).toBe(false);
  });

  it('denies unrelated roles', () => {
    expect(canAccessMaintenanceHub(user({ role: 'STUDENT' }))).toBe(false);
    expect(canAccessMaintenanceHub(user({ role: 'ITEM_WRITER' }))).toBe(false);
  });
});
