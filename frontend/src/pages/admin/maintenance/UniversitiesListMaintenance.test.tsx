import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { universityService, type UniversityRecord } from '../../../services/backendUniversityService';
import { authorizationError, networkError, serviceSuccess, validationError } from '../../../services/serviceResult';
import { MaintenanceDataProvider } from '../../../services/maintenanceDataContext';
import UniversitiesListMaintenance from './UniversitiesListMaintenance';

const university: UniversityRecord = {
  id: '1',
  code: 'UNI-00001',
  name: 'University of the Philippines Diliman',
  classification: 'Public',
  region: 'NCR',
  city: 'Quezon City',
  presidentRector: 'Dr. Angelo A. Jimenez',
  email: 'info@up.edu.ph',
  phone: '(02) 8981-8500',
  establishedYear: 1908,
  status: 'Active',
  courseCount: 0,
  createdAt: '2026-08-06T00:00:00Z',
  updatedAt: '2026-08-06T00:00:00Z',
};

function renderPage() {
  return render(
    <MaintenanceDataProvider>
      <MemoryRouter><UniversitiesListMaintenance /></MemoryRouter>
    </MaintenanceDataProvider>,
  );
}

describe('UniversitiesListMaintenance', () => {
  beforeEach(() => {
    vi.spyOn(universityService, 'listUniversities').mockResolvedValue(serviceSuccess([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows backend data and loads a selected university course list', async () => {
    vi.mocked(universityService.listUniversities).mockResolvedValue(serviceSuccess([university]));
    const listCourses = vi.spyOn(universityService, 'listCourses').mockResolvedValue(serviceSuccess([]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText(university.name));

    expect(listCourses).toHaveBeenCalledWith(university.id);
    expect(await screen.findByText('No college courses yet')).toBeInTheDocument();
    expect(screen.getByText(`${university.code} - College Courses`)).toBeInTheDocument();
  });

  it.each([
    ['authorization', authorizationError('You cannot read this registry.')],
    ['network', networkError('The backend is unavailable.')],
  ])('surfaces an initial %s failure as a page error', async (_name, failure) => {
    vi.mocked(universityService.listUniversities).mockResolvedValue(failure);

    renderPage();

    expect(await screen.findByText(failure.error.message)).toBeInTheDocument();
  });

  it('creates a university through the service and renders the persisted response', async () => {
    const createUniversity = vi.spyOn(universityService, 'createUniversity').mockResolvedValue(
      serviceSuccess(university),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No universities yet');

    await user.click(screen.getByRole('button', { name: /add university/i }));
    await user.type(screen.getByPlaceholderText('Official name of university...'), university.name);
    await user.type(screen.getByPlaceholderText('e.g. Quezon City'), university.city);
    await user.click(screen.getByRole('button', { name: 'Save University' }));

    expect(createUniversity).toHaveBeenCalledWith(expect.objectContaining({
      name: university.name,
      city: university.city,
      classification: 'Public',
      status: 'Active',
    }));
    expect(await screen.findByText(university.name)).toBeInTheDocument();
  });

  it('keeps the form open and shows a backend validation error', async () => {
    vi.spyOn(universityService, 'createUniversity').mockResolvedValue(
      validationError('A university with this name already exists in this region.', {
        name: ['A university with this name already exists in this region.'],
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No universities yet');

    await user.click(screen.getByRole('button', { name: /add university/i }));
    await user.type(screen.getByPlaceholderText('Official name of university...'), university.name);
    await user.type(screen.getByPlaceholderText('e.g. Quezon City'), university.city);
    await user.click(screen.getByRole('button', { name: 'Save University' }));

    expect(await screen.findByText('A university with this name already exists in this region.')).toBeInTheDocument();
    // The modal stays open on failure so the admin can correct and retry.
    expect(screen.getByText('Add New University')).toBeInTheDocument();
  });

  it('does not refetch the university list when the page remounts within the cached provider', async () => {
    const listUniversities = vi
      .mocked(universityService.listUniversities)
      .mockResolvedValue(serviceSuccess([university]));
    const user = userEvent.setup();

    // The provider outlives the page: toggling the page off/on mimics a tab switch.
    function Harness() {
      const [visible, setVisible] = useState(true);
      return (
        <>
          <button onClick={() => setVisible((v) => !v)}>toggle</button>
          {visible && <UniversitiesListMaintenance />}
        </>
      );
    }

    render(
      <MaintenanceDataProvider>
        <MemoryRouter><Harness /></MemoryRouter>
      </MaintenanceDataProvider>,
    );

    await screen.findByText(university.name);
    await user.click(screen.getByRole('button', { name: 'toggle' })); // unmount page
    await user.click(screen.getByRole('button', { name: 'toggle' })); // remount page
    await screen.findByText(university.name);

    expect(listUniversities).toHaveBeenCalledTimes(1);
  });
});
