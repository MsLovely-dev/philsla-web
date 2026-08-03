import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authService = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('./services', () => ({
  createPrototypeAuthService: () => authService,
}));

import { INITIAL_MAINTENANCE_MODULES, PhilSAProvider, usePhilSA } from './PhilSAContext';
import { PhilSAProvider, usePhilSA } from './PhilSAContext';

function AuthStateProbe() {
  const { isAuthInitialized, isLoading } = usePhilSA();
  return <p>{`${isAuthInitialized}:${isLoading}`}</p>;
}

describe('PhilSAProvider authentication bootstrap', () => {
  beforeEach(() => {
    authService.getCurrentSession.mockReset();
  });

  it('does not request a session when the provider mounts on a public page', () => {
    render(
      <PhilSAProvider>
        <AuthStateProbe />
      </PhilSAProvider>,
    );

    expect(screen.getByText('false:false')).toBeInTheDocument();
    expect(authService.getCurrentSession).not.toHaveBeenCalled();
  });
});

describe('Maintenance Center catalog', () => {
  it('contains the six modules from the updated Maintenance Center', () => {
    const maintenancePaths = INITIAL_MAINTENANCE_MODULES
      .filter((module) => module.category === 'Maintenance & Protocols' && module.path !== '/admin/maintenance')
      .map((module) => module.path);

    expect(maintenancePaths).toEqual([
      '/admin/maintenance/registration',
      '/admin/maintenance/review-student-application',
      '/admin/maintenance/exam-blueprint',
      '/admin/maintenance/question-bank-management',
      '/admin/maintenance/exam-review',
      '/admin/maintenance/exam-results',
    ]);
  });
});
