import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportConfigModal, type ImportColumnOption } from './ImportConfigModal';

const columns: ImportColumnOption[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'region', label: 'Region', required: true },
  { key: 'status', label: 'Status' },
];

function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function csvFile(text: string): File {
  return new File([text], 'registry.csv', { type: 'text/csv' });
}

function renderModal(onImport = vi.fn()) {
  render(
    <ImportConfigModal
      isOpen
      columns={columns}
      templateFilename="Registry_template.csv"
      onCancel={() => {}}
      onImport={onImport}
    />,
  );
  return onImport;
}

describe('ImportConfigModal', () => {
  afterEach(() => vi.restoreAllMocks());

  it('parses a file, previews the rows, and hands mapped rows to onImport', async () => {
    const onImport = renderModal(vi.fn().mockResolvedValue({ ok: true, created: 2 }));
    const user = userEvent.setup();

    await user.upload(fileInput(), csvFile('Name,Region\nUP Diliman,NCR\nAteneo,NCR\n'));

    expect(await screen.findByText('2 rows ready')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Import 2 rows/i }));

    expect(onImport).toHaveBeenCalledWith([
      { name: 'UP Diliman', region: 'NCR' },
      { name: 'Ateneo', region: 'NCR' },
    ]);
    expect(await screen.findByText(/Imported 2 rows successfully/i)).toBeInTheDocument();
  });

  it('blocks import and warns when a required column is missing', async () => {
    renderModal();
    const user = userEvent.setup();

    await user.upload(fileInput(), csvFile('Name\nUP Diliman\n'));

    expect(await screen.findByText(/Missing required column/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import 1 row/i })).toBeDisabled();
  });

  it('renders the per-row error report when the import fails atomically', async () => {
    renderModal(
      vi.fn().mockResolvedValue({
        ok: false,
        message: 'Some rows could not be imported.',
        errors: [{ row: 1, fields: { name: ['This field is required.'] } }],
      }),
    );
    const user = userEvent.setup();

    await user.upload(fileInput(), csvFile('Name,Region\nUP Diliman,NCR\n,NCR\n'));
    await user.click(await screen.findByRole('button', { name: /Import 2 rows/i }));

    expect(await screen.findByText('Some rows could not be imported.')).toBeInTheDocument();
    expect(screen.getByText('Row 3')).toBeInTheDocument(); // data row index 1 -> spreadsheet row 3
    expect(screen.getByText(/This field is required\./)).toBeInTheDocument();
  });
});
