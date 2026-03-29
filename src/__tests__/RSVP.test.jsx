import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RSVP from '../pages/RSVP';

describe('RSVP Page', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders all form fields', () => {
    render(<RSVP />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/will you attend/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of guests/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dietary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit rsvp/i })).toBeInTheDocument();
  });

  it('shows a thank-you message after a successful submission', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });

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

  it('shows an alert when the API returns an error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Submission failed' }),
    });

    render(<RSVP />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/will you attend/i), { target: { value: 'no' } });
    fireEvent.change(screen.getByLabelText(/number of guests/i), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Submission failed')
    );
  });

  it('sends the correct payload to the API', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });

    render(<RSVP />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/will you attend/i), { target: { value: 'yes' } });
    fireEvent.change(screen.getByLabelText(/number of guests/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/dietary/i), { target: { value: 'Vegan' } });

    fireEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const [url, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe('/api/rsvp');
    expect(body).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
      rsvp: 'yes',
      guests: 3,
      dietary: 'Vegan',
    });
  });
});
