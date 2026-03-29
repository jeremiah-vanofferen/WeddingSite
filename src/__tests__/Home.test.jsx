import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../pages/Home';

describe('Home Page', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders the welcome message from the API', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        websiteName: 'Our Wedding',
        welcomeMessage: 'So glad you are here!',
        showCountdown: 'true',
        allowRsvp: 'true',
      }),
    });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByText('So glad you are here!')).toBeInTheDocument()
    );
    expect(screen.getByRole('heading', { name: 'Our Wedding' })).toBeInTheDocument();
  });

  it('renders wedding venue details from the API', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        websiteName: 'Our Wedding',
        weddingLocation: 'The Grand Hall',
        weddingAddress: '123 Main St, Springfield',
        weddingDate: '2026-08-08',
        weddingTime: '16:00',
      }),
    });

    render(<Home />);

    await waitFor(() =>
      expect(screen.getByText('The Grand Hall')).toBeInTheDocument()
    );
    expect(screen.getByText('123 Main St, Springfield')).toBeInTheDocument();
  });

  it('still renders the page when the API call fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Home />);

    // Default heading should still be rendered (from initial state)
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    );
  });
});
