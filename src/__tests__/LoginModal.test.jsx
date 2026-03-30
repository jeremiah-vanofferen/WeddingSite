import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginModal from '../components/LoginModal';

const mockLogin = vi.fn();

vi.mock('../utils/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

function renderModal(props = {}) {
  return render(<LoginModal isOpen={true} onClose={vi.fn()} {...props} />);
}

describe('LoginModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('heading', { name: /admin login/i })).not.toBeInTheDocument();
  });

  it('renders the login form when open', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /admin login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows a validation error when submitting empty fields', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() =>
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
    );
  });

  it('calls login with the entered credentials', async () => {
    mockLogin.mockResolvedValueOnce(true);
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'secret');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows an error message when login fails', async () => {
    mockLogin.mockResolvedValueOnce(false);
    renderModal();

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    );
  });
});
