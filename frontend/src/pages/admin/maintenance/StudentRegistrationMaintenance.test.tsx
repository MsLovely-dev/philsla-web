import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendApplicationService,
  type StudentRegistrationFieldConfig,
} from '../../../services/backendApplicationService';
import { networkError, serviceSuccess, validationError } from '../../../services/serviceResult';
import StudentRegistrationMaintenance from './StudentRegistrationMaintenance';

const sampleField: StudentRegistrationFieldConfig = {
  id: 1,
  section: 'Step 1 Registration',
  type: 'Student Registration Field',
  value: 'Sample Enrollment Category',
  fieldSection: 'Personal Information',
  inputType: 'text',
  optionValues: [],
  priority: 'High Priority',
  remarks: '',
  status: true,
};

const sampleMethod: StudentRegistrationFieldConfig = {
  id: 2,
  section: 'Step 1 Registration',
  type: 'Verification Method',
  value: 'Sample Manual Entry',
  status: true,
};

const philsysMethod: StudentRegistrationFieldConfig = {
  id: 3,
  section: 'Step 1 Registration',
  type: 'Verification Method',
  value: 'PhilSys National ID',
  status: false,
};

function page(results: StudentRegistrationFieldConfig[], count = results.length) {
  return serviceSuccess({ count, next: null, previous: null, results });
}

function renderPage() {
  return render(<StudentRegistrationMaintenance />);
}

// The create/edit modal in MaintenancePageTemplate renders each field's <label>
// as a sibling of its <input>/<select>, with no htmlFor/id association — a real,
// pre-existing accessibility gap (getByLabelText cannot find these controls).
// Fixing it means restructuring MaintenancePageTemplate, which the plan
// explicitly excludes from this ticket's scope, so selection here is positional
// (matching the fields[] render order: section, type, fieldSection, inputType,
// priority) rather than by accessible label.
async function fillRequiredCreateFields(user: ReturnType<typeof userEvent.setup>, value: string) {
  const [sectionSelect, typeSelect, fieldSectionSelect, inputTypeSelect] = screen.getAllByRole('combobox');
  await user.selectOptions(sectionSelect, 'Step 1 Registration');
  await user.selectOptions(typeSelect, 'Student Registration Field');
  await user.type(screen.getByPlaceholderText('e.g. Regular Senior High, First Name Input Field'), value);
  await user.selectOptions(fieldSectionSelect, 'Personal Information');
  await user.selectOptions(inputTypeSelect, 'text');
}

describe('StudentRegistrationMaintenance', () => {
  beforeEach(() => {
    vi.spyOn(backendApplicationService, 'listStudentRegistrationFieldsPage').mockResolvedValue(page([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the empty table state while the initial request is pending (no distinct loading indicator exists)', () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('No Records Found')).toBeInTheDocument();
  });

  it('shows the empty state when the backend returns zero records', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(page([]));

    renderPage();

    expect(await screen.findByText('No Records Found')).toBeInTheDocument();
  });

  it('renders paginated records returned by the backend', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(page([sampleField], 15));

    renderPage();

    expect(await screen.findByText(sampleField.value)).toBeInTheDocument();
    // Pagination shows the page window (page 1 of pageSize 10), not the actual
    // row count returned — 1-10, even though only one row came back.
    expect(screen.getByText('1-10')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('requests the next page from the backend instead of paginating client-side', async () => {
    const list = vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage);
    list.mockResolvedValue(page([sampleField], 15));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(sampleField.value);

    await user.click(screen.getByRole('button', { name: '2' }));

    await vi.waitFor(() => {
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 10 }));
    });
  });

  it('requests a backend search instead of filtering the loaded page locally', async () => {
    const list = vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage);
    list.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No Records Found');

    await user.type(screen.getByPlaceholderText('Search records...'), 'Sample');

    await vi.waitFor(() => {
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ search: 'Sample', page: 1 }));
    });
  });

  it('requests backend-filtered status, priority, and input-type values from the advanced filters', async () => {
    const list = vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage);
    list.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No Records Found');

    await user.click(screen.getByRole('button', { name: /Advanced Filters/ }));
    await user.selectOptions(screen.getByLabelText('Status'), 'Active');
    await user.selectOptions(screen.getByLabelText('Priority'), 'High Priority');
    await user.selectOptions(screen.getByLabelText('Input Type'), 'text');

    await vi.waitFor(() => {
      expect(list).toHaveBeenCalledWith(expect.objectContaining({
        status: true,
        priority: 'High Priority',
        inputType: 'text',
      }));
    });
  });

  it('creates a Student Registration field through the service and shows a success message', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(page([]));
    const create = vi.spyOn(backendApplicationService, 'createStudentRegistrationField').mockResolvedValue(
      serviceSuccess(sampleField),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No Records Found');

    await user.click(screen.getByRole('button', { name: /Create New Entry/ }));
    await fillRequiredCreateFields(user, 'Sample Enrollment Category');
    await user.click(screen.getByRole('button', { name: 'Submit Entry' }));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      section: 'Step 1 Registration',
      type: 'Student Registration Field',
      value: 'Sample Enrollment Category',
      fieldSection: 'Personal Information',
      inputType: 'text',
    }));
    expect(await screen.findByText('Registration field saved.')).toBeInTheDocument();
  });

  it('keeps the form open and shows a client-side validation error when required fields are missing', async () => {
    const create = vi.spyOn(backendApplicationService, 'createStudentRegistrationField');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No Records Found');

    await user.click(screen.getByRole('button', { name: /Create New Entry/ }));
    await user.click(screen.getByRole('button', { name: 'Submit Entry' }));

    expect(await screen.findByText('Value / Label is required')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText('Create New Entry', { selector: 'h2' })).toBeInTheDocument();
  });

  it('shows a backend validation error without losing the entered form data', async () => {
    vi.spyOn(backendApplicationService, 'createStudentRegistrationField').mockResolvedValue(
      validationError('This field value already exists.', { value: ['This field value already exists.'] }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No Records Found');

    await user.click(screen.getByRole('button', { name: /Create New Entry/ }));
    await fillRequiredCreateFields(user, 'Sample Enrollment Category');
    await user.click(screen.getByRole('button', { name: 'Submit Entry' }));

    expect(await screen.findByText('This field value already exists.')).toBeInTheDocument();
  });

  it('shows a network error banner when the initial list request fails', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(
      networkError('The backend is unavailable.'),
    );

    renderPage();

    expect(await screen.findByText('The backend is unavailable.')).toBeInTheDocument();
  });

  it('deletes a field after confirmation and shows a success message', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(page([sampleField]));
    const del = vi.spyOn(backendApplicationService, 'deleteStudentRegistrationField').mockResolvedValue(serviceSuccess(null));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText(sampleField.value)).closest('tr')!;

    await user.click(within(row).getAllByRole('button')[2]);

    expect(del).toHaveBeenCalledWith(sampleField.id);
    expect(await screen.findByText('Registration field deleted.')).toBeInTheDocument();
  });

  it('does not delete when the confirmation dialog is dismissed', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(page([sampleField]));
    const del = vi.spyOn(backendApplicationService, 'deleteStudentRegistrationField');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText(sampleField.value)).closest('tr')!;

    await user.click(within(row).getAllByRole('button')[2]);

    expect(del).not.toHaveBeenCalled();
  });

  it('shows a backend error banner when delete fails', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(page([sampleField]));
    vi.spyOn(backendApplicationService, 'deleteStudentRegistrationField').mockResolvedValue(
      networkError('The backend is unavailable.'),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText(sampleField.value)).closest('tr')!;

    await user.click(within(row).getAllByRole('button')[2]);

    expect(await screen.findByText('The backend is unavailable.')).toBeInTheDocument();
  });

  it('toggles a verification method through the update endpoint', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(
      page([sampleMethod], 1),
    );
    const update = vi.spyOn(backendApplicationService, 'updateStudentRegistrationField').mockResolvedValue(
      serviceSuccess({ ...sampleMethod, status: false }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Registration Methods/ }));
    const toggle = await screen.findByRole('button', { name: `Disable ${sampleMethod.value}` });
    await user.click(toggle);

    expect(update).toHaveBeenCalledWith(sampleMethod.id, expect.objectContaining({ status: false }));
    expect(await screen.findByText('Registration field updated.')).toBeInTheDocument();
  });

  it('shows PhilSys National ID as locked instead of an enable/disable toggle', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(
      page([philsysMethod], 1),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Registration Methods/ }));

    expect(await screen.findByText('Locked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PhilSys National ID/ })).not.toBeInTheDocument();
  });

  it('never reads or writes localStorage — no local mock-record fallback exists', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(page([sampleField]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(sampleField.value);

    await user.type(screen.getByPlaceholderText('Search records...'), 'x');

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('gives the search input, advanced filters toggle, and create action accessible names', async () => {
    renderPage();
    await screen.findByText('No Records Found');

    expect(screen.getByPlaceholderText('Search records...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Advanced Filters/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Entry/ })).toBeInTheDocument();
  });

  it('gives the verification-method toggle an accessible name that names the record', async () => {
    vi.mocked(backendApplicationService.listStudentRegistrationFieldsPage).mockResolvedValue(
      page([sampleMethod], 1),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Registration Methods/ }));

    expect(await screen.findByRole('button', { name: `Disable ${sampleMethod.value}` })).toBeInTheDocument();
  });
});
