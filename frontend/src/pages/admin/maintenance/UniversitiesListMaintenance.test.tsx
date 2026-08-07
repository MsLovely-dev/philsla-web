import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  universityService,
  type CollegeCourseRecord,
  type UniversityRecord,
} from '../../../services/backendUniversityService';
import {
  authorizationError,
  networkError,
  serviceSuccess,
  validationError,
} from '../../../services/serviceResult';
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

function pageResult(results: UniversityRecord[], count = results.length, next: string | null = null) {
  return {
    count,
    next,
    previous: null,
    results,
    summary: { total: count, public: 0, private: 0, active: 0, totalCourses: 0 },
  };
}

function renderPage() {
  return render(
    <MaintenanceDataProvider>
      <MemoryRouter><UniversitiesListMaintenance /></MemoryRouter>
    </MaintenanceDataProvider>,
  );
}

describe('UniversitiesListMaintenance', () => {
  // Stateful dataset so the list load and the reload-after-mutation both read it.
  let data: UniversityRecord[];

  beforeEach(() => {
    data = [];
    vi.spyOn(universityService, 'listUniversitiesPage').mockImplementation(async () =>
      serviceSuccess(pageResult(data)),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the current page of universities from the server', async () => {
    data = [university];
    renderPage();
    expect(await screen.findByText(university.name)).toBeInTheDocument();
  });

  it('drills into a university and loads its courses (loading, then empty)', async () => {
    data = [university];
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
    vi.mocked(universityService.listUniversitiesPage).mockResolvedValue(failure);
    renderPage();
    expect(await screen.findByText(failure.error.message)).toBeInTheDocument();
  });

  it('creates a university and reloads the current page', async () => {
    const createUniversity = vi.spyOn(universityService, 'createUniversity').mockImplementation(async () => {
      data = [university];
      return serviceSuccess(university);
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No universities yet');

    await user.click(screen.getByRole('button', { name: /add university/i }));
    fireEvent.change(screen.getByPlaceholderText('Official name of university...'), { target: { value: university.name } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Quezon City'), { target: { value: university.city } });
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
    fireEvent.change(screen.getByPlaceholderText('Official name of university...'), { target: { value: university.name } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Quezon City'), { target: { value: university.city } });
    await user.click(screen.getByRole('button', { name: 'Save University' }));

    expect(await screen.findByText('A university with this name already exists in this region.')).toBeInTheDocument();
    expect(screen.getByText('Add New University')).toBeInTheDocument();
  });

  it('requests the next page from the server', async () => {
    const second = { ...university, id: '2', code: 'UNI-00002', name: 'Ateneo de Manila University' };
    const listPage = vi.mocked(universityService.listUniversitiesPage).mockImplementation(async (params) =>
      serviceSuccess(params.page === 2 ? pageResult([second], 40) : pageResult([university], 40, 'next')),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(university.name);

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(listPage).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    expect(await screen.findByText(second.name)).toBeInTheDocument();
  });

  it('runs search on the server (debounced)', async () => {
    const listPage = vi.mocked(universityService.listUniversitiesPage).mockResolvedValue(pageResultOk([university]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(university.name);

    await user.type(screen.getByPlaceholderText('Name, code, city...'), 'diliman');

    await waitFor(() =>
      expect(listPage).toHaveBeenCalledWith(expect.objectContaining({ search: 'diliman' })),
    );
  });

  it('downloads the server-built CSV blob when Download is confirmed', async () => {
    data = [university];
    const csvBlob = new Blob(["University Name\r\n'=cmd|/c calc"], { type: 'text/csv' });
    const exportSpy = vi
      .spyOn(universityService, 'exportUniversities')
      .mockResolvedValue(serviceSuccess(csvBlob));
    const captured: Blob[] = [];
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      captured.push(blob as Blob);
      return 'blob:mock';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(university.name);

    await user.click(screen.getByRole('button', { name: /export csv/i }));
    await user.click(await screen.findByRole('button', { name: 'Download CSV' }));

    await waitFor(() => expect(exportSpy).toHaveBeenCalled());
    expect(exportSpy.mock.calls[0][0].columns.length).toBeGreaterThan(0);
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(captured[0]).toBe(csvBlob);
  });

  it('serves a re-opened university\'s courses from cache without refetching', async () => {
    const course: CollegeCourseRecord = {
      id: 'c1',
      universityId: university.id,
      universityCode: university.code,
      collegeName: 'College of Engineering',
      programCode: 'BSCS',
      programName: 'Bachelor of Science in Computer Science',
      degreeType: 'Bachelor of Science',
      majorSpecialization: '',
      durationYears: 4,
      totalUnits: 150,
      cutoffPercentile: 85,
      status: 'Active',
      createdAt: '2026-08-06T00:00:00Z',
      updatedAt: '2026-08-06T00:00:00Z',
    };
    data = [university];
    const listCourses = vi.spyOn(universityService, 'listCourses').mockResolvedValue(serviceSuccess([course]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText(university.name));
    expect(await screen.findByText(course.programName)).toBeInTheDocument();
    expect(listCourses).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /back to all universities/i }));
    await user.click(await screen.findByText(university.name));
    expect(await screen.findByText(course.programName)).toBeInTheDocument();
    expect(listCourses).toHaveBeenCalledTimes(1); // cached
  });

  it('does not refetch the list when the page remounts within the cached provider', async () => {
    data = [university];
    const listPage = vi.mocked(universityService.listUniversitiesPage);
    const user = userEvent.setup();

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
    const callsAfterLoad = listPage.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'toggle' })); // unmount page
    await user.click(screen.getByRole('button', { name: 'toggle' })); // remount page
    await screen.findByText(university.name);

    expect(listPage.mock.calls.length).toBe(callsAfterLoad); // no extra fetches
  });
});

function pageResultOk(results: UniversityRecord[]) {
  return serviceSuccess(pageResult(results));
}
