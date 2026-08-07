import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SystemIntegration from './SystemIntegration';
import { backendApplicationService } from '../../services/backendApplicationService';

vi.mock('../../PhilSAContext', () => ({
  usePhilSA: () => ({
    addAuditLog: vi.fn(),
  }),
}));

vi.mock('../../services/backendApplicationService', async () => {
  const actual = await vi.importActual<typeof import('../../services/backendApplicationService')>('../../services/backendApplicationService');
  return {
    ...actual,
    backendApplicationService: {
      getRegistrationIntegrationStatus: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          backend: { status: 'connected' },
          methods: [
            { id: 'manual', label: 'Manual Registration', status: 'available', active: true, message: 'Manual Registration is available.' },
            { id: 'lrn', label: 'LRN Verification', status: 'placeholder', active: false, message: 'LRN verification is prepared for provider integration but no live DepEd connection is active.' },
            { id: 'philsys', label: 'PhilSys National ID', status: 'locked', active: false, message: 'PhilSys National ID integration is locked until official API requirements are approved.' },
          ],
        },
      }),
    },
  };
});

describe('SystemIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies backend registration integration readiness from the button', async () => {
    const user = userEvent.setup();

    render(<SystemIntegration />);

    expect(screen.getByRole('button', { name: /verify connection/i })).toBeInTheDocument();
    expect(screen.getByText(/Connection Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Not verified yet/i)).toBeInTheDocument();
    expect(backendApplicationService.getRegistrationIntegrationStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /verify connection/i }));

    expect(await screen.findByText(/Connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Manual Registration is available/i)).toBeInTheDocument();
    expect(screen.getByText(/no live DepEd connection is active/i)).toBeInTheDocument();
    expect(screen.getByText(/locked until official API requirements are approved/i)).toBeInTheDocument();
    expect(backendApplicationService.getRegistrationIntegrationStatus).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/ph_deped_lis_live/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/philsys_production_cert/i)).not.toBeInTheDocument();
  });

  it('shows configured DepEd LRN provider details without exposing token values', async () => {
    vi.mocked(backendApplicationService.getRegistrationIntegrationStatus).mockResolvedValueOnce({
      ok: true,
      data: {
        backend: { status: 'connected' },
        methods: [
          { id: 'manual', label: 'Manual Registration', status: 'available', active: true, message: 'Manual Registration is available.' },
          { id: 'lrn', label: 'LRN Verification', status: 'available', active: true, message: 'LRN verification is connected to the configured DepEd test provider.' },
          { id: 'philsys', label: 'PhilSys National ID', status: 'locked', active: false, message: 'PhilSys National ID integration is locked until official API requirements are approved.' },
        ],
      },
    });
    const user = userEvent.setup();

    render(<SystemIntegration />);

    await user.click(screen.getByRole('button', { name: /verify connection/i }));

    expect(await screen.findByText(/DepEd LRN test provider/i)).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/v1\/learners\/verify/i)).toBeInTheDocument();
    expect(screen.getByText(/Bearer token is stored backend-only/i)).toBeInTheDocument();
    expect(screen.getByText(/Requires LRN and birthday/i)).toBeInTheDocument();
    expect(screen.queryByText(/mlrn_test_/i)).not.toBeInTheDocument();
  });
});
