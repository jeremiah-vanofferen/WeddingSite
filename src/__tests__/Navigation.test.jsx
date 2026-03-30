import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from '../Navigation';

vi.mock('../utils/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../components/LoginModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="login-modal" /> : null,
}));

import { useAuth } from '../utils/AuthContext';

const defaultSettings = { websiteName: 'Test Wedding' };

function renderNav(settings = defaultSettings) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navigation settings={settings} />
    </MemoryRouter>
  );
}

describe('Navigation (logged out)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isLoggedIn: false, logout: vi.fn() });
  });

  it('displays the website name as a brand link', () => {
    renderNav();
    expect(screen.getByText('Test Wedding')).toBeInTheDocument();
  });

  it('shows an "Admin Login" button when not authenticated', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /admin login/i })).toBeInTheDocument();
  });

  it('does not show the Admin nav link when not authenticated', () => {
    renderNav();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows the standard navigation links', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rsvp/i })).toBeInTheDocument();
  });
});

describe('Navigation (logged in)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isLoggedIn: true, logout: vi.fn() });
  });

  it('shows a "Logout" button when authenticated', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('shows the Admin nav link when authenticated', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
  });

  it('does not show the "Admin Login" button when authenticated', () => {
    renderNav();
    expect(screen.queryByRole('button', { name: /admin login/i })).not.toBeInTheDocument();
  });
});
