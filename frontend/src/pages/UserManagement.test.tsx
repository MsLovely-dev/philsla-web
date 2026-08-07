import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const backendAdminUserService = vi.hoisted(() => ({
  listUsers: vi.fn(),
  listRoles: vi.fn(),
}));

vi.mock('../services/backendAdminUserService', () => ({
  backendAdminUserService,
}));

vi.mock('../PhilSAContext', async () => {
  const actual = await vi.importActual<typeof import('../PhilSAContext')>('../PhilSAContext');
  return {
    ...actual,
    usePhilSA: () => ({
      addAuditLog: vi.fn(),
      maintenanceModules: actual.INITIAL_MAINTENANCE_MODULES,
    }),
  };
});

import UserManagement from './UserManagement';

describe('UserManagement permission matrix', () => {
  it('shows live exam management modules when assigning modular permissions', async () => {
    backendAdminUserService.listUsers.mockResolvedValue({ ok: true, data: [] });
    backendAdminUserService.listRoles.mockResolvedValue({ ok: true, data: [] });

    render(<UserManagement />);

    await userEvent.click(screen.getByRole('button', { name: /add user/i }));

    expect(await screen.findByText('Question Bank')).toBeInTheDocument();
    expect(screen.getByText('Bulk Upload Center')).toBeInTheDocument();
  });
});
