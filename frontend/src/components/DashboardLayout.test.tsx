import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { usePhilSA } from '../PhilSAContext';
import { User } from '../types';
import { DashboardLayout } from './DashboardLayout';

vi.mock('../PhilSAContext', async () => {
  const actual = await vi.importActual<typeof import('../PhilSAContext')>('../PhilSAContext');
  return { ...actual, usePhilSA: vi.fn() };
});

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

function renderSidebar(user: User) {
  mockUsePhilSA.mockReturnValue({
    user,
    logout: vi.fn(),
    maintenanceModules: [],
  } as unknown as ReturnType<typeof usePhilSA>);

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardLayout>
        <div>content</div>
      </DashboardLayout>
    </MemoryRouter>,
  );
}

// The sidebar also has an unrelated "Student Registration" audit-log link
// (Exam Management Hub > Audit Logs, SYSTEM_ADMIN-only), so queries must
// disambiguate by href rather than accessible name alone.
function findMaintenanceRegistrationLink() {
  return screen
    .queryAllByRole('link', { name: 'Student Registration' })
    .find((link) => link.getAttribute('href') === '/admin/maintenance/registration');
}

describe('DashboardLayout sidebar — Student Registration discovery', () => {
  it('shows the link for System Admin', () => {
    renderSidebar(baseUser({ role: 'SYSTEM_ADMIN' }));
    expect(findMaintenanceRegistrationLink()).toBeInTheDocument();
  });

  it('shows the link for DepEd Admin via the exact backend role', () => {
    renderSidebar(baseUser({ role: 'GOVERNMENT', backendRole: 'DEPED_ADMIN', email: 'deped.admin@example.test' }));
    expect(findMaintenanceRegistrationLink()).toBeInTheDocument();
  });

  it('hides the link for University Admin even with a matching module permission', () => {
    renderSidebar(baseUser({ role: 'UNIVERSITY_ADMIN', permissions: ['MOD_36_READ', 'MOD_36_WRITE', 'MOD_36_EDIT'] }));
    expect(findMaintenanceRegistrationLink()).toBeUndefined();
  });

  it('hides the link for Admissions Reviewer', () => {
    renderSidebar(baseUser({ role: 'ADMISSIONS_REVIEWER' }));
    expect(findMaintenanceRegistrationLink()).toBeUndefined();
  });

  it('hides the link for CHED Admin despite sharing the GOVERNMENT display role', () => {
    renderSidebar(baseUser({ role: 'GOVERNMENT', backendRole: 'CHED_ADMIN', email: 'ched.admin@example.test' }));
    expect(findMaintenanceRegistrationLink()).toBeUndefined();
  });

  it('hides the link for TESDA Admin despite sharing the GOVERNMENT display role', () => {
    renderSidebar(baseUser({ role: 'GOVERNMENT', backendRole: 'TESDA_ADMIN', email: 'tesda.admin@example.test' }));
    expect(findMaintenanceRegistrationLink()).toBeUndefined();
  });
});
