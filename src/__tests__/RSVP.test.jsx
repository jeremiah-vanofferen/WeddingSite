// Copyright 2026 Jeremiah Van Offeren
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RSVP from '../pages/RSVP';

const mockRsvpFetch = () => {
  global.fetch = vi.fn((url) => {
    if (url.includes('/public/guest-lookup')) {
      return Promise.resolve({ ok: true, json: async () => ({ suggestions: ['John Doe', 'Jane Doe'] }) });
    }

    if (url.includes('/rsvp')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
};

describe('RSVP Page', () => {
  beforeEach(() => {
    mockRsvpFetch();
  });

  it('renders all form fields', async () => {
    render(<RSVP />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/will you attend/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of guests/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit rsvp/i })).toBeInTheDocument();
    await waitFor(() => {
      const options = document.querySelectorAll('#rsvp-guest-suggestions option');
      expect(options).toHaveLength(2);
    });
  });

  it('loads guest names into name autofill suggestions', async () => {
    render(<RSVP />);

    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveAttribute('list', 'rsvp-guest-suggestions');

    await waitFor(() => {
      const options = document.querySelectorAll('#rsvp-guest-suggestions option');
      expect(options).toHaveLength(2);
    });
  });

  it('shows a thank-you message after a successful submission', async () => {
    render(<RSVP />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/will you attend/i), { target: { value: 'yes' } });
    fireEvent.change(screen.getByLabelText(/number of guests/i), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /rsvp received/i })).toBeInTheDocument()
    );
  });

  it('shows an inline error when the API returns an error', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/public/guest-lookup')) {
        return Promise.resolve({ ok: true, json: async () => ({ suggestions: [] }) });
      }

      if (url.includes('/rsvp')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Submission failed' }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<RSVP />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/will you attend/i), { target: { value: 'no' } });
    fireEvent.change(screen.getByLabelText(/number of guests/i), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Submission failed')
    );
  });

  it('shows a fallback submission error when the API error response is not JSON', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/public/guest-lookup')) {
        return Promise.resolve({ ok: true, json: async () => ({ suggestions: [] }) });
      }

      if (url.includes('/rsvp')) {
        return Promise.resolve({
          ok: false,
          json: async () => {
            throw new Error('Invalid JSON');
          },
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<RSVP />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText(/will you attend/i), { target: { value: 'no' } });
    fireEvent.change(screen.getByLabelText(/number of guests/i), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Submission failed. Please try again.')
    );
  });

  it('sends the correct payload to the API', async () => {
    render(<RSVP />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/will you attend/i), { target: { value: 'yes' } });
    fireEvent.change(screen.getByLabelText(/number of guests/i), { target: { value: '3' } });

    fireEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const call = global.fetch.mock.calls.find(([url]) => url.includes('/rsvp'));
    expect(call).toBeDefined();

    const [url, options] = call;
    const body = JSON.parse(options.body);
    expect(url).toContain('/api/rsvp');
    expect(body).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
      rsvp: 'yes',
      guests: 3,
    });
  });
});
