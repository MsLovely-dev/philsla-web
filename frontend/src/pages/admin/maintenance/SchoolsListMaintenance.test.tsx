import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { schoolService, type SchoolRecord } from '../../../services/backendSchoolService';
import { serviceSuccess, validationError } from '../../../services/serviceResult';
import { MaintenanceDataProvider } from '../../../services/maintenanceDataContext';
import SchoolsListMaintenance from './SchoolsListMaintenance';

const school: SchoolRecord = {
  id: '1',
  code: 'SCH-00001',
  classification: 'Public',
  name: 'Philippine Science High School',
  examineeCapacity: 1200,
  region: 'NCR',
  status: 'Active',
  createdAt: '2026-08-06T00:00:00Z',
  updatedAt: '2026-08-06T00:00:00Z',
};

const EMPTY_STATE = 'No schools yet';

function renderPage() {
  return render(
    <MaintenanceDataProvider>
      <MemoryRouter>
        <SchoolsListMaintenance />
      </MemoryRouter>
    </MaintenanceDataProvider>,
  );
}

describe('SchoolsListMaintenance', () => {
  beforeEach(() => {
    // Default: the screen loads an empty registry on mount.
    vi.spyOn(schoolService, 'listSchools').mockResolvedValue(serviceSuccess([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the schools returned by the service', async () => {
    vi.spyOn(schoolService, 'listSchools').mockResolvedValue(serviceSuccess([school]));

    renderPage();

    expect(await screen.findByText(school.name)).toBeInTheDocument();
    expect(screen.getByText(school.code)).toBeInTheDocument();
  });

  it('shows the empty state when the service returns no schools', async () => {
    renderPage();

    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
  });

  it('creates a school through the service and renders the persisted row', async () => {
    const createSchool = vi.spyOn(schoolService, 'createSchool').mockResolvedValue(serviceSuccess(school));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(EMPTY_STATE);

    await user.click(screen.getByRole('button', { name: /add new school/i }));
    await user.type(screen.getByPlaceholderText('Official name of school...'), school.name);
    await user.click(screen.getByRole('button', { name: 'Save School Record' }));

    // Code is server-generated: the client never sends it.
    expect(createSchool).toHaveBeenCalledWith(
      expect.objectContaining({
        classification: 'Public',
        name: school.name,
        examineeCapacity: 1000,
        region: expect.any(String),
      }),
    );
    expect(createSchool).toHaveBeenCalledWith(expect.not.objectContaining({ code: expect.anything() }));
    expect(await screen.findByText(school.name)).toBeInTheDocument();
  });

  it('keeps the modal open and surfaces a backend validation error', async () => {
    vi.spyOn(schoolService, 'createSchool').mockResolvedValue(
      validationError('This school name already exists.', { name: ['This school name already exists.'] }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(EMPTY_STATE);

    await user.click(screen.getByRole('button', { name: /add new school/i }));
    await user.type(screen.getByPlaceholderText('Official name of school...'), 'Duplicate School');
    await user.click(screen.getByRole('button', { name: 'Save School Record' }));

    expect(await screen.findByText('This school name already exists.')).toBeInTheDocument();
    // The modal stays open so the admin can correct the input.
    expect(screen.getByText('Register New Accredited School')).toBeInTheDocument();
  });

  it('deletes a school through the confirmation dialog', async () => {
    vi.spyOn(schoolService, 'listSchools').mockResolvedValue(serviceSuccess([school]));
    const deleteSchool = vi.spyOn(schoolService, 'deleteSchool').mockResolvedValue(serviceSuccess(null));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(school.name);

    await user.click(screen.getByRole('button', { name: 'Remove School' }));
    await user.click(screen.getByRole('button', { name: 'Agree' }));

    expect(deleteSchool).toHaveBeenCalledWith(school.id);
    await waitFor(() => expect(screen.queryByText(school.name)).not.toBeInTheDocument());
  });
});
