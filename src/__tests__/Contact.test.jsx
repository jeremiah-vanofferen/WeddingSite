import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Contact from '../pages/Contact';

describe('Contact Page', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders all form fields', () => {
    render(<Contact />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('shows a success message after a successful submission', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });

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
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
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

  it('sends the correct payload to the API', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });

    render(<Contact />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Charlie' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'charlie@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Great site!' } });

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const [url, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe('/api/messages');
    expect(body).toEqual({
      name: 'Charlie',
      email: 'charlie@example.com',
      message: 'Great site!',
    });
  });
});
