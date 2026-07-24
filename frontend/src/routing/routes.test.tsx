import { describe, expect, it } from 'vitest';
import { APP_ROUTES } from './routes';

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
    expect(APP_ROUTES.find((route) => route.path === '/student/application')?.allowedRoles).toEqual(['STUDENT']);
    expect(APP_ROUTES.find((route) => route.path === '/admin/users')?.allowedRoles).toEqual(['SYSTEM_ADMIN']);
    expect(APP_ROUTES.find((route) => route.path === '/grader/queue')?.allowedRoles).toContain('GRADER');
    expect(APP_ROUTES.find((route) => route.path === '/support/dashboard')?.allowedRoles).toContain('TECH_SUPPORT');
  });

  it('gives every protected route at least one allowed role', () => {
    const missingRoles = APP_ROUTES.filter(
      (route) => route.access === 'protected' && !route.allowedRoles?.length,
    );
    expect(missingRoles).toEqual([]);
  });
});
