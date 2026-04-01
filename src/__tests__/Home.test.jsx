import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../pages/Home';

describe('Home Page', () => {
  const mockFetchForHome = (settings = {}) => vi.fn((url) => {
    if (typeof url === 'string' && url.includes('/gallery/carousel/featured')) {
      return Promise.resolve({
        ok: true,
        json: async () => ([]),
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => settings,
    });
  });

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders the welcome message from the API', async () => {
    global.fetch = mockFetchForHome({
      websiteName: 'Our Wedding',
      welcomeMessage: 'So glad you are here!',
      showCountdown: 'true',
      allowRsvp: 'true',
    });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByText('So glad you are here!')).toBeInTheDocument()
    );
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
  });

  it('renders wedding venue details from the API', async () => {
    global.fetch = mockFetchForHome({
      websiteName: 'Our Wedding',
      weddingLocation: 'The Grand Hall',
      weddingAddress: '123 Main St, Springfield',
      weddingDate: '2026-08-08',
      weddingTime: '16:00',
    });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByText('The Grand Hall')).toBeInTheDocument()
    );
    expect(screen.getByText('123 Main St, Springfield')).toBeInTheDocument();
  });

  it('still renders the page when the API call fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    render(<Home />);

    // The page should still render its default section headings.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    );
    expect(screen.getByRole('heading', { name: 'Wedding Details' })).toBeInTheDocument();
  });

  it('displays the registry link when registryUrl is provided', async () => {
    global.fetch = mockFetchForHome({
      websiteName: 'Our Wedding',
      weddingLocation: 'The Grand Hall',
      weddingAddress: '123 Main St, Springfield',
      weddingDate: '2026-08-08',
      weddingTime: '16:00',
      registryUrl: 'https://www.example.com/registry',
    });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /view our registry/i })).toBeInTheDocument()
    );
  });

  it('shows the countdown section when showCountdown is true', async () => {
    global.fetch = mockFetchForHome({
      showCountdown: 'true',
      weddingDate: '2099-01-01',
      weddingTime: '12:00',
    });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByTestId('countdown-section')).toBeInTheDocument()
    );
    expect(screen.getByRole('heading', { name: /counting down/i })).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Minutes')).toBeInTheDocument();
    expect(screen.getByText('Seconds')).toBeInTheDocument();
  });

  it('hides the countdown section when showCountdown is false', async () => {
    global.fetch = mockFetchForHome({ showCountdown: 'false' });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    );
    expect(screen.queryByTestId('countdown-section')).not.toBeInTheDocument();
  });

  it('shows arrival message when wedding date has passed', async () => {
    global.fetch = mockFetchForHome({
      showCountdown: 'true',
      weddingDate: '2000-01-01',
      weddingTime: '12:00',
    });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByText(/the wedding day has arrived/i)).toBeInTheDocument()
    );
  });
});
