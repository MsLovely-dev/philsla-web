import type { User } from '../types';

export function canAccessStudentRegistrationMaintenance(user: User): boolean {
  return user.role === 'SYSTEM_ADMIN' || user.backendRole === 'DEPED_ADMIN';
}
