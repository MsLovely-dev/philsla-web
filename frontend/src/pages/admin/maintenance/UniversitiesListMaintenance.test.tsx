import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendUniversityService,
  type UniversityItem,
} from '../../../services/backendUniversityService';
import { authorizationError, networkError, serviceSuccess, validationError } from '../../../services/serviceResult';
import UniversitiesListMaintenance from './UniversitiesListMaintenance';

const university: UniversityItem = {
  id: '7c034b91-830e-4cb7-9bf3-5d87e8acc174',
  code: 'UP-DIL',
  name: 'University of the Philippines Diliman',
  classification: 'Public',
  region: 'NCR - National Capital Region',
  city: 'Quezon City',
  presidentRector: 'University President',
  email: 'info@example.test',
  phone: '(02) 0000-0000',
  establishedYear: 1908,
  status: 'Active',
  courseCount: 0,
  version: 1,
  createdAt: '2026-08-03T00:00:00Z',
  updatedAt: '2026-08-03T00:00:00Z',
};

function renderPage() {
  return render(<MemoryRouter><UniversitiesListMaintenance /></MemoryRouter>);
}

function universityPage(items: UniversityItem[], page: number, next: string | null, previous: string | null) {
  return serviceSuccess(items, {
    count: 21,
    next,
    previous,
    page,
    pageSize: 10,
    summary: {
      totalUniversities: 21,
      publicUniversities: 12,
      privateUniversities: 9,
      totalDegreeCourses: 84,
    },
  });
}

function coursePage(items: never[], page: number, next: string | null, previous: string | null) {
  return serviceSuccess(items, { count: 11, next, previous, page, pageSize: 10 });
}

describe('UniversitiesListMaintenance', () => {
  beforeEach(() => {
    vi.spyOn(backendUniversityService, 'listUniversities').mockResolvedValue(universityPage([], 1, null, null));
  });

  it('shows a loading state while the university request is pending', () => {
    vi.mocked(backendUniversityService.listUniversities).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('Loading university registry')).toBeInTheDocument();
  });

  it('shows backend data and loads a selected university course list', async () => {
    vi.mocked(backendUniversityService.listUniversities).mockResolvedValue(universityPage([university], 1, null, null));
    const listCourses = vi.spyOn(backendUniversityService, 'listCourses').mockResolvedValue(coursePage([], 1, null, null));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText(university.name));

    expect(listCourses).toHaveBeenCalledWith(university.id, 1);
    expect(await screen.findByText('No college courses match your search criteria.')).toBeInTheDocument();
    expect(screen.getByText(`${university.code} - College Courses`)).toBeInTheDocument();
  });

  it('requests the next university page instead of loading all pages', async () => {
    const secondPageUniversity = { ...university, id: 'uni-2', code: 'ADMU', name: 'Ateneo de Manila University' };
    const listUniversities = vi.mocked(backendUniversityService.listUniversities)
      .mockResolvedValueOnce(universityPage([university], 1, 'http://backend.test/universities?page=2', null))
      .mockResolvedValueOnce(universityPage([secondPageUniversity], 2, null, 'http://backend.test/universities?page=1'));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Next university page' }));

    expect(listUniversities).toHaveBeenNthCalledWith(1, 1);
    expect(listUniversities).toHaveBeenNthCalledWith(2, 2);
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(await screen.findByText(secondPageUniversity.name)).toBeInTheDocument();
  });

  it('requests the next course page for the selected university', async () => {
    vi.mocked(backendUniversityService.listUniversities).mockResolvedValue(universityPage([university], 1, null, null));
    const listCourses = vi.spyOn(backendUniversityService, 'listCourses')
      .mockResolvedValueOnce(coursePage([], 1, 'http://backend.test/courses?page=2', null))
      .mockResolvedValueOnce(coursePage([], 2, null, 'http://backend.test/courses?page=1'));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText(university.name));
    await user.click(await screen.findByRole('button', { name: 'Next course page' }));

    expect(listCourses).toHaveBeenNthCalledWith(1, university.id, 1);
    expect(listCourses).toHaveBeenNthCalledWith(2, university.id, 2);
  });

  it.each([
    ['authorization', authorizationError('You cannot read this registry.')],
    ['network', networkError('The backend is unavailable.')],
  ])('shows a retryable page state for an initial %s failure', async (_name, failure) => {
    vi.mocked(backendUniversityService.listUniversities).mockResolvedValue(failure);

    renderPage();

    expect(await screen.findByText('University registry unavailable')).toBeInTheDocument();
    expect(screen.getByText(failure.error.message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('creates a university through the service and renders the persisted response', async () => {
    const createUniversity = vi.spyOn(backendUniversityService, 'createUniversity').mockResolvedValue(
      serviceSuccess(university),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No universities match your search and filter criteria.');

    await user.click(screen.getByRole('button', { name: /add university/i }));
    await user.type(screen.getByPlaceholderText('e.g. UP-DIL'), university.code);
    await user.type(screen.getByPlaceholderText('Official name of university...'), university.name);
    await user.type(screen.getByPlaceholderText('e.g. Quezon City'), university.city);
    await user.click(screen.getByRole('button', { name: 'Save University' }));

    expect(createUniversity).toHaveBeenCalledWith(expect.objectContaining({
      code: university.code,
      name: university.name,
      city: university.city,
      classification: 'Public',
      status: 'Active',
    }));
    expect(await screen.findByText(university.name)).toBeInTheDocument();
    expect(screen.getByText('University added')).toBeInTheDocument();
  });

  it('keeps the form open and shows a backend validation error', async () => {
    vi.spyOn(backendUniversityService, 'createUniversity').mockResolvedValue(
      validationError('This university code already exists.', { code: ['This university code already exists.'] }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No universities match your search and filter criteria.');

    await user.click(screen.getByRole('button', { name: /add university/i }));
    await user.type(screen.getByPlaceholderText('e.g. UP-DIL'), university.code);
    await user.type(screen.getByPlaceholderText('Official name of university...'), university.name);
    await user.type(screen.getByPlaceholderText('e.g. Quezon City'), university.city);
    await user.click(screen.getByRole('button', { name: 'Save University' }));

    expect(await screen.findByText('University not saved')).toBeInTheDocument();
    expect(screen.getByText('This university code already exists.')).toBeInTheDocument();
    expect(screen.getByText('Add New University')).toBeInTheDocument();
  });
});
