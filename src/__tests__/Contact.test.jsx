// Copyright 2026 Jeremiah Van Offeren
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Contact from '../pages/Contact';

const mockContactFetch = () => {
  global.fetch = vi.fn((url) => {
    if (url.includes('/public/guest-lookup')) {
      return Promise.resolve({ ok: true, json: async () => ({ field: 'name', suggestions: ['Alice', 'Bob'] }) });
    }

    if (url.includes('/messages')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
};

describe('Contact Page', () => {
  beforeEach(() => {
    mockContactFetch();
  });

  it('renders all form fields', async () => {
    render(<Contact />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    await waitFor(() => {
      const options = document.querySelectorAll('#contact-guest-suggestions option');
      expect(options).toHaveLength(2);
    });
  });

  it('loads guest names into name autofill suggestions', async () => {
    render(<Contact />);

    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveAttribute('list', 'contact-guest-suggestions');

    await waitFor(() => {
      const options = document.querySelectorAll('#contact-guest-suggestions option');
      expect(options).toHaveLength(2);
    });
  });

  it('shows a success message after a successful submission', async () => {
    render(<Contact />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hello there!' } });

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /message sent/i })).toBeInTheDocument()
    );
  });

  it('shows an inline error when the API returns an error', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/public/guest-lookup')) {
        return Promise.resolve({ ok: true, json: async () => ({ field: 'name', suggestions: [] }) });
      }

      if (url.includes('/messages')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Server error' }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Contact />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bob@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hi!' } });

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    );
  });

  it('shows a fallback submission error when the API error response is not JSON', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/public/guest-lookup')) {
        return Promise.resolve({ ok: true, json: async () => ({ field: 'name', suggestions: [] }) });
      }

      if (url.includes('/messages')) {
        return Promise.resolve({
          ok: false,
          json: async () => {
            throw new Error('Invalid JSON');
          },
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Contact />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Pat' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'pat@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hello' } });

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Submission failed. Please try again.')
    );
  });

  it('sends the correct payload to the API', async () => {
    render(<Contact />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Charlie' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'charlie@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Great site!' } });

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const call = global.fetch.mock.calls.find(([url]) => url.includes('/messages'));
    expect(call).toBeDefined();

    const [url, options] = call;
    const body = JSON.parse(options.body);
    expect(url).toContain('/api/messages');
    expect(body).toEqual({
      name: 'Charlie',
      email: 'charlie@example.com',
      message: 'Great site!',
    });
  });
});
