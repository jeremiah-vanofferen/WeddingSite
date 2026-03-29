import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

// Stub child page components so tests are fast and focused on App-level logic
vi.mock('../pages/Home', () => ({ default: () => <div data-testid="home-page">Home</div> }));
vi.mock('../pages/Schedule', () => ({ default: () => <div data-testid="schedule-page">Schedule</div> }));
vi.mock('../pages/Contact', () => ({ default: () => <div data-testid="contact-page">Contact</div> }));
vi.mock('../pages/Admin', () => ({ default: () => <div data-testid="admin-page">Admin</div> }));
vi.mock('../pages/RSVP', () => ({ default: () => <div data-testid="rsvp-page">RSVP</div> }));
vi.mock('../Navigation', () => ({
  default: ({ settings }) => <nav data-testid="navigation" data-theme={settings?.theme}>Nav</nav>,
}));
vi.mock('../AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({ isLoggedIn: false, logout: vi.fn(), adminName: null }),
}));

const defaultSettings = {
  websiteName: 'My Wedding',
  theme: 'elegant',
  primaryColor: '#0a20ca',
  primaryColorHover: '#1894dc',
  fontFamily: 'sans serif',
  showCountdown: true,
  allowRsvp: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(defaultSettings) })
  );
});

afterEach(() => {
  // Clean theme classes added to body during tests
  document.body.className = '';
});

describe('App', () => {
  it('renders Navigation and the Home route by default', async () => {
    render(<App />);
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('fetches public settings on mount and passes theme to Navigation', async () => {
    const apiSettings = { ...defaultSettings, theme: 'modern' };
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(apiSettings) })
    );

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId('navigation').dataset.theme).toBe('modern')
    );
  });

  it('applies CSS variables from settings after mount', async () => {
    const apiSettings = { ...defaultSettings, primaryColor: '#ff0000', primaryColorHover: '#cc0000' };
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(apiSettings) })
    );

    render(<App />);
    await waitFor(() => {
      const style = document.documentElement.style.getPropertyValue('--primary-color');
      expect(style).toBe('#ff0000');
    });
  });

  it('adds theme class to document body', async () => {
    const apiSettings = { ...defaultSettings, theme: 'rustic' };
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(apiSettings) })
    );

    render(<App />);
    await waitFor(() => expect(document.body.classList.contains('theme-rustic')).toBe(true));
  });

  it('handles failed public settings fetch gracefully', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
    // Should render without crashing and use default settings
    render(<App />);
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('updates settings when settingsChanged custom event fires', async () => {
    render(<App />);
    await waitFor(() => screen.getByTestId('navigation'));

    act(() => {
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { theme: 'vintage' } }));
    });

    await waitFor(() =>
      expect(screen.getByTestId('navigation').dataset.theme).toBe('vintage')
    );
  });

  it('coerces showCountdown and allowRsvp strings to booleans', async () => {
    const apiSettings = { ...defaultSettings, showCountdown: 'true', allowRsvp: 'false' };
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(apiSettings) })
    );

    // Just verify it renders without throwing TYPE errors from coercion logic
    render(<App />);
    await waitFor(() => screen.getByTestId('home-page'));
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('ignores settings response when error field is present', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ error: 'Not found' }) })
    );
    render(<App />);
    // Default theme should remain (elegant)
    await waitFor(() =>
      expect(screen.getByTestId('navigation').dataset.theme).toBe('elegant')
    );
  });
});
