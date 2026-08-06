import type { User, UserRole } from '../types';

export function canAccessStudentRegistrationMaintenance(user: User): boolean {
  return user.role === 'SYSTEM_ADMIN' || user.backendRole === 'DEPED_ADMIN';
}

const MAINTENANCE_HUB_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'UNIVERSITY_ADMIN',
  'ADMISSIONS_REVIEWER',
  'EXAM_ADMINISTRATOR',
  'PROCTOR',
  'PROCTOR_ADMIN',
];

export function canAccessMaintenanceHub(user: User): boolean {
  return MAINTENANCE_HUB_ROLES.includes(user.role) || user.backendRole === 'DEPED_ADMIN';
}
