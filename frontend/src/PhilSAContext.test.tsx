import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authService = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('./services', () => ({
  createPrototypeAuthService: () => authService,
}));

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
