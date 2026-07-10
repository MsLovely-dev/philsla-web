import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from './ConfirmationDialog';
import { NotificationToast } from './NotificationToast';
import { EmptyState, ErrorState, LoadingState } from './StateDisplay';

describe('state displays', () => {
  it('announces loading as a busy status', () => {
    render(<LoadingState title="Loading applications" message="Fetching the latest records." />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('heading', { name: 'Loading applications' })).toBeInTheDocument();
  });

  it('renders an empty state action', async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<EmptyState title="No applications" action={<button onClick={onCreate}>Create application</button>} />);

    await user.click(screen.getByRole('button', { name: 'Create application' }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('announces errors assertively', () => {
    render(<ErrorState message="The request could not be completed." />);

    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('ConfirmationDialog', () => {
  it('focuses the safe action and confirms explicitly', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmationDialog
        isOpen
        title="Publish results?"
        message="This action affects all students."
        confirmLabel="Publish"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancels on Escape', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmationDialog
        isOpen
        title="Delete record?"
        message="The record will be removed."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('keeps keyboard focus inside the open dialog', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationDialog
        isOpen
        title="Confirm action?"
        message="Review the action before continuing."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    const close = screen.getByRole('button', { name: 'Close dialog' });
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
  });
});

describe('NotificationToast', () => {
  it('uses alert semantics for errors and supports dismissal', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<NotificationToast title="Save failed" message="Try again." tone="error" onDismiss={onDismiss} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
