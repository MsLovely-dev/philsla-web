import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { usePhilSA } from '../../../PhilSAContext';
import { User } from '../../../types';
import MaintenanceHub from './MaintenanceHub';

vi.mock('../../../PhilSAContext', () => ({ usePhilSA: vi.fn() }));

const mockUsePhilSA = vi.mocked(usePhilSA);

function baseUser(overrides: Partial<User>): User {
  return {
    id: 'u1',
    email: 'u1@example.test',
    firstName: 'Test',
    lastName: 'User',
    role: 'SYSTEM_ADMIN',
    ...overrides,
  };
}

function renderHub(user: User) {
  mockUsePhilSA.mockReturnValue({ user } as unknown as ReturnType<typeof usePhilSA>);

  return render(
    <MemoryRouter>
      <MaintenanceHub />
    </MemoryRouter>,
  );
}

describe('MaintenanceHub — Student Registration card discovery', () => {
  it('shows the card for System Admin', () => {
    renderHub(baseUser({ role: 'SYSTEM_ADMIN' }));
    expect(screen.getByRole('heading', { name: 'Student Registration' })).toBeInTheDocument();
  });

  it('shows the card for DepEd Admin via the exact backend role', () => {
    renderHub(baseUser({ role: 'GOVERNMENT', backendRole: 'DEPED_ADMIN', email: 'deped.admin@example.test' }));
    expect(screen.getByRole('heading', { name: 'Student Registration' })).toBeInTheDocument();
  });

  it('hides the card for University Admin', () => {
    renderHub(baseUser({ role: 'UNIVERSITY_ADMIN' }));
    expect(screen.queryByRole('heading', { name: 'Student Registration' })).not.toBeInTheDocument();
  });

  it('hides the card for Admissions Reviewer', () => {
    renderHub(baseUser({ role: 'ADMISSIONS_REVIEWER' }));
    expect(screen.queryByRole('heading', { name: 'Student Registration' })).not.toBeInTheDocument();
  });

  it('hides the card for CHED Admin despite sharing the GOVERNMENT display role', () => {
    renderHub(baseUser({ role: 'GOVERNMENT', backendRole: 'CHED_ADMIN', email: 'ched.admin@example.test' }));
    expect(screen.queryByRole('heading', { name: 'Student Registration' })).not.toBeInTheDocument();
  });

  it('hides the card for TESDA Admin despite sharing the GOVERNMENT display role', () => {
    renderHub(baseUser({ role: 'GOVERNMENT', backendRole: 'TESDA_ADMIN', email: 'tesda.admin@example.test' }));
    expect(screen.queryByRole('heading', { name: 'Student Registration' })).not.toBeInTheDocument();
  });
});
