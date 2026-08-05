import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { serviceSuccess, unknownError } from '../../../services/serviceResult';
import type { NationalOverview } from '../../../services/contracts';

// jsdom has no IntersectionObserver; KPICard's framer-motion `whileInView` needs one.
class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);

const getNationalOverview = vi.fn();

vi.mock('../../../services/analyticsService', () => ({
  analyticsService: { getNationalOverview: () => getNationalOverview() },
}));

async function renderDashboard() {
  const { default: NationalDashboard } = await import('./NationalDashboard');
  return render(<NationalDashboard />);
}

const overview: NationalOverview = {
  totalRegisteredExaminees: 4200,
  totalVerifiedExaminees: 3900,
  totalParticipatingSchools: 120,
  totalParticipatingUniversities: 45,
  regionalBreakdown: [{ region: 'NCR', applicationCount: 2500 }],
  generatedAt: '2026-08-02T08:24:17.868767+00:00',
};

describe('NationalDashboard', () => {
  it('shows a loading affordance on the backed KPI cards while the overview is pending', async () => {
    getNationalOverview.mockReturnValue(new Promise(() => {}));

    await renderDashboard();

    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
    expect(screen.getByText('Total Active Sessions')).toBeInTheDocument();
  }, 15000);

  it('renders real values for backed KPI cards and the regional breakdown on success', async () => {
    getNationalOverview.mockResolvedValue(serviceSuccess(overview));

    await renderDashboard();

    await waitFor(() => expect(screen.getByText('4,200')).toBeInTheDocument(), { timeout: 10000 });
    expect(screen.getByText('3,900')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();

    // Unbacked cards stay on static mock values regardless of the fetch outcome.
    expect(screen.getByText('942,800')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toBeInTheDocument();
    expect(screen.getByText('14,500')).toBeInTheDocument();
  }, 15000);

  it('falls back to static mock values for the backed KPI cards on failure without breaking other widgets', async () => {
    getNationalOverview.mockResolvedValue(unknownError('boom'));

    await renderDashboard();

    await waitFor(() => expect(screen.queryAllByText('…').length).toBe(0), { timeout: 10000 });

    // Backed cards fall back to their original mock display values.
    expect(screen.getByText('1.24M')).toBeInTheDocument();
    expect(screen.getByText('1.18M')).toBeInTheDocument();
    expect(screen.getByText('12,402')).toBeInTheDocument();
    expect(screen.getByText('2,402')).toBeInTheDocument();

    // Unbacked widgets are unaffected by the analytics call failing.
    expect(screen.getByText('942,800')).toBeInTheDocument();
    expect(screen.getByText('No regional application data available yet.')).toBeInTheDocument();
  }, 15000);
});
