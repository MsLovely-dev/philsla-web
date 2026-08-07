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

function pageResult(results: SchoolRecord[], count = results.length, next: string | null = null) {
  return {
    count,
    next,
    previous: null,
    results,
    summary: { total: count, public: 0, private: 0, active: 0, totalCapacity: 0 },
  };
}

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
  let data: SchoolRecord[];

  beforeEach(() => {
    data = [];
    vi.spyOn(schoolService, 'listSchoolsPage').mockImplementation(async () => serviceSuccess(pageResult(data)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the current page of schools from the server', async () => {
    data = [school];
    renderPage();
    expect(await screen.findByRole('button', { name: school.name })).toBeInTheDocument();
    expect(screen.getByText(school.code)).toBeInTheDocument();
  });

  it('shows the empty state when the registry is empty', async () => {
    renderPage();
    expect(await screen.findByText('No schools yet')).toBeInTheDocument();
  });

  it('creates a school and reloads the current page', async () => {
    const createSchool = vi.spyOn(schoolService, 'createSchool').mockImplementation(async () => {
      data = [school];
      return serviceSuccess(school);
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No schools yet');

    await user.click(screen.getByRole('button', { name: /add new school/i }));
    await user.type(screen.getByPlaceholderText('Official name of school...'), school.name);
    await user.click(screen.getByRole('button', { name: 'Save School Record' }));

    expect(createSchool).toHaveBeenCalledWith(
      expect.objectContaining({ classification: 'Public', name: school.name, examineeCapacity: 1000 }),
    );
    expect(await screen.findByRole('button', { name: school.name })).toBeInTheDocument();
  });

  it('keeps the modal open and surfaces a backend validation error', async () => {
    vi.spyOn(schoolService, 'createSchool').mockResolvedValue(
      validationError('This school name already exists.', { name: ['This school name already exists.'] }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No schools yet');

    await user.click(screen.getByRole('button', { name: /add new school/i }));
    await user.type(screen.getByPlaceholderText('Official name of school...'), 'Duplicate School');
    await user.click(screen.getByRole('button', { name: 'Save School Record' }));

    expect(await screen.findByText('This school name already exists.')).toBeInTheDocument();
    expect(screen.getByText('Register New Accredited School')).toBeInTheDocument();
  });

  it('deletes a school through the confirmation dialog', async () => {
    data = [school];
    const deleteSchool = vi.spyOn(schoolService, 'deleteSchool').mockImplementation(async () => {
      data = [];
      return serviceSuccess(null);
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: school.name });

    await user.click(screen.getByRole('button', { name: 'Remove School' }));
    await user.click(screen.getByRole('button', { name: 'Agree' }));

    expect(deleteSchool).toHaveBeenCalledWith(school.id);
    await waitFor(() => expect(screen.queryByRole('button', { name: school.name })).not.toBeInTheDocument());
  });

  it('clamps back to the previous page when a delete empties the last page', async () => {
    // 21 rows over a page size of 20: page 2 holds a single row. Deleting it must
    // reload page 1 (page 2 no longer exists) instead of re-requesting the now
    // out-of-range page, which the backend 404s.
    const second = { ...school, id: '2', code: 'SCH-00002', name: 'Manila Science High School' };
    let count = 21;
    const listPage = vi.mocked(schoolService.listSchoolsPage).mockImplementation(async (params) =>
      serviceSuccess(
        params.page === 2 ? pageResult([second], count) : pageResult([school], count, count > 20 ? 'next' : null),
      ),
    );
    vi.spyOn(schoolService, 'deleteSchool').mockImplementation(async () => {
      count = 20;
      return serviceSuccess(null);
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: school.name });

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByRole('button', { name: second.name });

    await user.click(screen.getByRole('button', { name: 'Remove School' }));
    await user.click(screen.getByRole('button', { name: 'Agree' }));

    await waitFor(() => expect(listPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
    expect(await screen.findByRole('button', { name: school.name })).toBeInTheDocument();
  });

  it('imports schools from a CSV file and reloads the list', async () => {
    data = [school];
    const importSchools = vi
      .spyOn(schoolService, 'importSchools')
      .mockResolvedValue(serviceSuccess({ created: 1 }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: school.name });

    await user.click(screen.getByRole('button', { name: /import csv/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      new File(
        ['Name,Classification,Examinee Capacity,Region/Municipality/City\nManila HS,Public,900,NCR\n'],
        'schools.csv',
        { type: 'text/csv' },
      ),
    );
    await user.click(await screen.findByRole('button', { name: /Import 1 row/i }));

    expect(importSchools).toHaveBeenCalledWith([
      { name: 'Manila HS', classification: 'Public', examineeCapacity: '900', region: 'NCR' },
    ]);
    expect(await screen.findByText(/Imported 1 row successfully/i)).toBeInTheDocument();
  });

  it('opens a details modal from the school name and can jump to editing', async () => {
    data = [school];
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: school.name }));
    expect(await screen.findByText('School Details')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(await screen.findByText('Edit Accredited School')).toBeInTheDocument();
    // The details modal stays mounted underneath, so cancelling the edit returns to it.
    expect(screen.getByText('School Details')).toBeInTheDocument();
  });

  it('opens the delete confirmation from the details modal', async () => {
    data = [school];
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: school.name }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText(/remove .* at Maintenance Table/i)).toBeInTheDocument();
  });

  it('requests the next page from the server', async () => {
    const second = { ...school, id: '2', code: 'SCH-00002', name: 'Manila Science High School' };
    const listPage = vi.mocked(schoolService.listSchoolsPage).mockImplementation(async (params) =>
      serviceSuccess(params.page === 2 ? pageResult([second], 40) : pageResult([school], 40, 'next')),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: school.name });

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(listPage).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    expect(await screen.findByRole('button', { name: second.name })).toBeInTheDocument();
  });

  it('runs search on the server (debounced)', async () => {
    data = [school];
    const listPage = vi.mocked(schoolService.listSchoolsPage);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: school.name });

    await user.type(screen.getByPlaceholderText('Name or code...'), 'science');

    await waitFor(() =>
      expect(listPage).toHaveBeenCalledWith(expect.objectContaining({ search: 'science' })),
    );
  });
});
