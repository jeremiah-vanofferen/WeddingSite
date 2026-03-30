import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePasswordModal from '../components/ChangePasswordModal';

describe('ChangePasswordModal', () => {
  let onSave;
  let onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
  });

  it('renders all password fields', () => {
    render(<ChangePasswordModal onSave={onSave} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it('shows a validation error when the new password is too short', async () => {
    render(<ChangePasswordModal onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { name: 'currentPassword', value: 'current-pass' },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { name: 'newPassword', value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { name: 'confirmPassword', value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('New password must be at least 8 characters long.')).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows a validation error when confirmation does not match', async () => {
    render(<ChangePasswordModal onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { name: 'currentPassword', value: 'current-pass' },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { name: 'newPassword', value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { name: 'confirmPassword', value: 'different-password' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('New password and confirmation do not match.')).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('clears a validation error after the user edits a field', async () => {
    render(<ChangePasswordModal onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { name: 'newPassword', value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { name: 'confirmPassword', value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('New password must be at least 8 characters long.')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { name: 'newPassword', value: 'long-enough-password' },
    });

    await waitFor(() => {
      expect(screen.queryByText('New password must be at least 8 characters long.')).not.toBeInTheDocument();
    });
  });

  it('calls onSave with the entered passwords when the form is valid', async () => {
    render(<ChangePasswordModal onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { name: 'currentPassword', value: 'current-pass' },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { name: 'newPassword', value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { name: 'confirmPassword', value: 'new-password' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        currentPassword: 'current-pass',
        newPassword: 'new-password',
        confirmPassword: 'new-password',
      });
    });
  });

  it('calls onClose from the cancel button and close icon', () => {
    render(<ChangePasswordModal onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    fireEvent.click(screen.getByRole('button', { name: /×/i }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});