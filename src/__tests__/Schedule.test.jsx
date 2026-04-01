import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Schedule from '../pages/Schedule';

describe('Schedule Page', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/public/settings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            weddingDate: '2026-08-08',
            weddingTimeZone: 'America/Chicago',
          }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => [] });
    });
  });

  it('fetches and renders schedule events', async () => {
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/schedule')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 1, time: '14:00', event: 'Ceremony', description: 'Outdoor ceremony' },
            { id: 2, time: '16:00', event: 'Reception', description: null },
          ],
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ weddingDate: '2026-08-08', weddingTimeZone: 'America/Chicago' }),
      });
    });

    render(<Schedule />);

    await waitFor(() => expect(screen.getByText('Ceremony')).toBeInTheDocument());
    expect(screen.getByText('Reception')).toBeInTheDocument();
    expect(screen.getByText('Outdoor ceremony')).toBeInTheDocument();
  });

  it('renders an empty list when the API returns no events', async () => {
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/schedule')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ weddingDate: '2026-08-08', weddingTimeZone: 'America/Chicago' }),
      });
    });

    render(<Schedule />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/schedule', undefined));
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('renders nothing extra when the API returns non-array data', async () => {
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/schedule')) {
        return Promise.resolve({ ok: true, json: async () => ({ error: 'server error' }) });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ weddingDate: '2026-08-08', weddingTimeZone: 'America/Chicago' }),
      });
    });

    render(<Schedule />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('formats event times into 12-hour format', async () => {
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/schedule')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, time: '14:00', event: 'Ceremony', description: null }],
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ weddingDate: '2026-08-08', weddingTimeZone: 'America/Chicago' }),
      });
    });

    render(<Schedule />);

    await waitFor(() => expect(screen.getByText('Ceremony')).toBeInTheDocument());
    // 14:00 should display as 2:00 PM
    expect(screen.getByText(/2:00 PM/i)).toBeInTheDocument();
  });
});
