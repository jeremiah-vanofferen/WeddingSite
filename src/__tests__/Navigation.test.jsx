// Copyright 2026 Jeremiah Van Offeren
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from '../Navigation';

vi.mock('../utils/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../components/LoginModal', () => ({
  default: ({ isOpen, onClose, onLoginSuccess }) =>
    isOpen ? (
      <div data-testid="login-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onLoginSuccess}>Login Success</button>
      </div>
    ) : null,
}));

import { useAuth } from '../utils/AuthContext';

const defaultSettings = { websiteName: 'Test Wedding', allowRsvp: true };

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

  it('shows a "Login" button when not authenticated', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
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

  it('shows the RSVP link when allowRsvp is true', () => {
    renderNav({ ...defaultSettings, allowRsvp: true });
    expect(screen.getByRole('link', { name: /rsvp/i })).toBeInTheDocument();
  });

  it('hides the RSVP link when allowRsvp is false', () => {
    renderNav({ ...defaultSettings, allowRsvp: false });
    expect(screen.queryByRole('link', { name: /rsvp/i })).not.toBeInTheDocument();
  });

  it('toggles the mobile drawer from the menu button', () => {
    renderNav();
    const toggleButton = screen.getByRole('button', { name: /toggle navigation menu/i });
    const navDrawer = document.getElementById('site-navigation');

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(navDrawer).not.toHaveClass('open');

    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(navDrawer).toHaveClass('open');
  });

  it('closes the mobile drawer when Escape is pressed', () => {
    renderNav();
    const toggleButton = screen.getByRole('button', { name: /toggle navigation menu/i });
    const navDrawer = document.getElementById('site-navigation');

    fireEvent.click(toggleButton);
    expect(navDrawer).toHaveClass('open');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(navDrawer).not.toHaveClass('open');
  });

  it('closes the mobile drawer when a nav link is clicked', () => {
    renderNav();
    const toggleButton = screen.getByRole('button', { name: /toggle navigation menu/i });
    const navDrawer = document.getElementById('site-navigation');

    fireEvent.click(toggleButton);
    expect(navDrawer).toHaveClass('open');

    fireEvent.click(screen.getByRole('link', { name: /^home$/i }));
    expect(navDrawer).not.toHaveClass('open');
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

  it('does not show the "Login" button when authenticated', () => {
    renderNav();
    expect(screen.queryByRole('button', { name: /^login$/i })).not.toBeInTheDocument();
  });
});

  describe('Navigation (login modal)', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ isLoggedIn: false, logout: vi.fn() });
    });

    it('shows the login modal when the Login button is clicked', () => {
      renderNav();
      expect(screen.queryByTestId('login-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^login$/i }));
      expect(screen.getByTestId('login-modal')).toBeInTheDocument();
    });

    it('closes the modal when the modal onClose callback fires', () => {
      renderNav();
      fireEvent.click(screen.getByRole('button', { name: /^login$/i }));
      expect(screen.getByTestId('login-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
      expect(screen.queryByTestId('login-modal')).not.toBeInTheDocument();
    });

    it('closes the modal when login succeeds', () => {
      renderNav();
      fireEvent.click(screen.getByRole('button', { name: /^login$/i }));
      expect(screen.getByTestId('login-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /login success/i }));
      expect(screen.queryByTestId('login-modal')).not.toBeInTheDocument();
    });
  });
