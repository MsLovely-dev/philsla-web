import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExportConfigModal, type ExportColumnOption, type ExportScopeOption } from './ExportConfigModal';

const columns: ExportColumnOption[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email', sensitive: true },
];

const scopeOptions: ExportScopeOption[] = [
  { value: 'filtered', label: 'Current filters' },
  { value: 'all', label: 'Entire registry' },
];

function renderModal(overrides: Partial<React.ComponentProps<typeof ExportConfigModal>> = {}) {
  const onExport = vi.fn();
  const onCancel = vi.fn();
  render(
    <ExportConfigModal
      isOpen
      columns={columns}
      scopeOptions={scopeOptions}
      scopeCounts={{ filtered: 3, all: 128 }}
      onExport={onExport}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onExport, onCancel };
}

describe('ExportConfigModal', () => {
  it('previews the row × column count for the selected scope', async () => {
    renderModal();
    // Non-sensitive columns default on (code, name) → 2 columns; first scope has 3 rows.
    expect(screen.getByText(/Exports 3 rows × 2 columns/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Entire registry/ }));
    expect(screen.getByText(/Exports 128 rows × 2 columns/)).toBeInTheDocument();
  });

  it('excludes PII columns by default and reports them in the preview', () => {
    renderModal();
    expect((screen.getByRole('checkbox', { name: /Email/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: /^Code/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('select all toggles every column, then clears them', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: /select all/i }));
    expect(screen.getByText(/× 3 columns/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(screen.getByText(/× 0 columns/)).toBeInTheDocument();
  });

  it('passes the chosen columns and scope to onExport', async () => {
    const { onExport } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(onExport).toHaveBeenCalledWith({ columns: ['code', 'name'], scope: 'filtered' });
  });

  it('disables Download and shows a preparing state while exporting', () => {
    renderModal({ isExporting: true });
    const download = screen.getByRole('button', { name: /Preparing/ });
    expect(download).toBeDisabled();
  });
});
