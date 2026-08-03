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

describe('UniversitiesListMaintenance', () => {
  beforeEach(() => {
    vi.spyOn(backendUniversityService, 'listUniversities').mockResolvedValue(serviceSuccess([]));
  });

  it('shows a loading state while the university request is pending', () => {
    vi.mocked(backendUniversityService.listUniversities).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('Loading university registry')).toBeInTheDocument();
  });

  it('shows backend data and loads a selected university course list', async () => {
    vi.mocked(backendUniversityService.listUniversities).mockResolvedValue(serviceSuccess([university]));
    const listCourses = vi.spyOn(backendUniversityService, 'listCourses').mockResolvedValue(serviceSuccess([]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText(university.name));

    expect(listCourses).toHaveBeenCalledWith(university.id);
    expect(await screen.findByText('No college courses match your search criteria.')).toBeInTheDocument();
    expect(screen.getByText(`${university.code} - College Courses`)).toBeInTheDocument();
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
