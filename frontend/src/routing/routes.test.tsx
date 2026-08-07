import { describe, expect, it } from 'vitest';
import { APP_ROUTES } from './routes';
import { canAccessStudentRegistrationMaintenance } from './roleAccess';

describe('APP_ROUTES', () => {
  it('defines unique concrete route paths', () => {
    const paths = APP_ROUTES.filter((route) => route.path !== '*').map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('keeps the not-found route last', () => {
    expect(APP_ROUTES.at(-1)?.path).toBe('*');
    expect(APP_ROUTES.at(-1)?.access).toBe('standalone');
  });

  it('protects both exam entry routes with the exam guard', () => {
    for (const path of ['/student/take-exam', '/exam/live']) {
      expect(APP_ROUTES.find((route) => route.path === path)?.access).toBe('exam');
    }
  });

  it('restricts representative role-specific modules', () => {
    expect(APP_ROUTES.find((route) => route.path === '/student/application')?.allowedRoles).toEqual(['STUDENT', 'SYSTEM_ADMIN']);
    expect(APP_ROUTES.find((route) => route.path === '/admin/users')?.allowedRoles).toEqual(['SYSTEM_ADMIN']);
    expect(APP_ROUTES.find((route) => route.path === '/admin/results/scores')?.allowedRoles).toEqual(['SYSTEM_ADMIN']);
    expect(APP_ROUTES.find((route) => route.path === '/admin/results/scores/:batchId/:candidateId')?.allowedRoles).toEqual(['SYSTEM_ADMIN']);
    expect(APP_ROUTES.find((route) => route.path === '/grader/queue')?.allowedRoles).toContain('GRADER');
    expect(APP_ROUTES.find((route) => route.path === '/support/dashboard')?.allowedRoles).toContain('TECH_SUPPORT');
  });

  it('authorizes release operators for results release and aggregate reporting', () => {
    expect(APP_ROUTES.find((route) => route.path === '/admin/hub/results-release')?.allowedRoles)
      .toEqual(['EXAM_ADMINISTRATOR', 'SYSTEM_ADMIN']);
    expect(APP_ROUTES.find((route) => route.path === '/admin/results/matrix')?.allowedRoles)
      .toEqual(['EXECUTIVE', 'GOVERNMENT', 'UNIVERSITY_ADMIN', 'EXAM_ADMINISTRATOR', 'SYSTEM_ADMIN']);
  });

  it('registers the updated Maintenance Center modules with their intended roles', () => {
    const expectedRoles = new Map([
      ['/admin/maintenance/schools', ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER']],
      ['/admin/maintenance/universities', ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER']],
      ['/admin/maintenance/exam-blueprint', ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER']],
    ]);

    for (const [path, roles] of expectedRoles) {
      const route = APP_ROUTES.find((candidate) => candidate.path === path);
      expect(route?.access).toBe('protected');
      expect(route?.allowedRoles).toHaveLength(roles.length);
      expect(route?.allowedRoles).toEqual(expect.arrayContaining(roles));
    }
  });

  it('gives every protected route at least one allowed role', () => {
    const missingRoles = APP_ROUTES.filter(
      (route) => route.access === 'protected' && !route.allowedRoles?.length,
    );
    expect(missingRoles).toEqual([]);
  });

  it('declares strict exact-role access for the Student Registration maintenance route only', () => {
    const registration = APP_ROUTES.find((route) => route.path === '/admin/maintenance/registration');
    expect(registration?.strictAccess).toBe(canAccessStudentRegistrationMaintenance);

    const otherMaintenanceRoutes = APP_ROUTES.filter(
      (route) => route.path.startsWith('/admin/maintenance/') && route.path !== '/admin/maintenance/registration',
    );
    for (const route of otherMaintenanceRoutes) {
      expect(route.strictAccess).toBeUndefined();
    }
  });
});
