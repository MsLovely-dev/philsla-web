import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExamBlueprintMaintenance from './ExamBlueprintMaintenance';
import SchoolsListMaintenance from './SchoolsListMaintenance';
import StudentRegistrationMaintenance from './StudentRegistrationMaintenance';
import UniversitiesListMaintenance from './UniversitiesListMaintenance';
import { universityService } from '../../../services/backendUniversityService';
import { schoolService } from '../../../services/backendSchoolService';
import { serviceSuccess } from '../../../services/serviceResult';
import { MaintenanceDataProvider } from '../../../services/maintenanceDataContext';

describe('active Maintenance Center tables', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each([
    ['student registration', <StudentRegistrationMaintenance />],
    ['exam blueprint', <ExamBlueprintMaintenance />],
  ])('starts the %s table without mock records', (_name, component) => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    render(component);

    expect(screen.getByText('No Records Found')).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('starts the schools table empty and ignores saved browser data', async () => {
    localStorage.setItem('philsa_maintenance_schools_list', JSON.stringify([{ name: 'Saved Mock School' }]));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(schoolService, 'listSchools').mockResolvedValue(serviceSuccess([]));

    render(<MaintenanceDataProvider><MemoryRouter><SchoolsListMaintenance /></MemoryRouter></MaintenanceDataProvider>);

    expect(await screen.findByText('No schools yet')).toBeInTheDocument();
    expect(screen.queryByText('Saved Mock School')).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('loads an empty universities table from the backend and ignores saved browser data', async () => {
    localStorage.setItem('philsa_maintenance_universities_list', JSON.stringify([{ name: 'Saved Mock University' }]));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(universityService, 'listUniversities').mockResolvedValue(serviceSuccess([]));

    render(<MaintenanceDataProvider><MemoryRouter><UniversitiesListMaintenance /></MemoryRouter></MaintenanceDataProvider>);

    expect(await screen.findByText('No universities yet')).toBeInTheDocument();
    expect(screen.queryByText('Saved Mock University')).not.toBeInTheDocument();
    await waitFor(() => expect(setItem).not.toHaveBeenCalled());
    setItem.mockRestore();
  });
});
