// Copyright 2026 Jeremiah Van Offeren
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuestManagementModal, AddGuestModal } from '../components/GuestManagementModal';
import Papa from 'papaparse';
import { mockGuests } from './fixtures/guests';

vi.mock('papaparse', () => ({
  default: { parse: vi.fn(), unparse: vi.fn(() => 'Name,Email\nAlice Smith,alice@example.com') }
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('authToken', 'test-token');
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) })
  );
});

describe('GuestManagementModal', () => {
  it('loads and displays guests from API', async () => {
    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Total Guests')).toBeInTheDocument();
  });

  it('shows error message when API fails to load guests', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Failed to load guests/i)).toBeInTheDocument());
    consoleErrorSpy.mockRestore();
  });

  it('calls onClose when Close button is clicked', async () => {
    const onClose = vi.fn();
    render(<GuestManagementModal onClose={onClose} />);
    await waitFor(() => screen.getByText('Alice Smith'));
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows upload error for non-CSV file', async () => {
    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const fileInput = document.querySelector('#csv-file');
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/valid CSV file/i)).toBeInTheDocument());
  });

  it('shows upload preview after successful CSV parse', async () => {
    Papa.parse.mockImplementation((_file, opts) => {
      opts.complete({ data: [{ Name: 'Guest Three', Email: 'guest.three@test.local' }] });
    });

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const fileInput = document.querySelector('#csv-file');
    const file = new File(['Name,Email\nGuest Three,guest.three@test.local'], 'guests.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/Preview/i)).toBeInTheDocument());
    expect(screen.getByText('Guest Three')).toBeInTheDocument();
  });

  it('shows error when CSV parse fails', async () => {
    Papa.parse.mockImplementation((_file, opts) => {
      opts.error({ message: 'Unexpected EOF' });
    });

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const fileInput = document.querySelector('#csv-file');
    const file = new File(['bad data'], 'guests.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/Error parsing file/i)).toBeInTheDocument());
  });

  it('calls bulk import API when Import Guests is clicked', async () => {
    Papa.parse.mockImplementation((_file, opts) => {
      opts.complete({ data: [{ Name: 'Guest Four', Email: 'guest.four@test.local' }] });
    });

    const bulkResponse = [...mockGuests, { id: 3, name: 'Guest Four', email: 'guest.four@test.local', rsvp: 'Pending', plusOne: false }];
    global.fetch = vi.fn((url) => {
      if (url.includes('/bulk')) return Promise.resolve({ ok: true, json: () => Promise.resolve(bulkResponse) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) });
    });

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const fileInput = document.querySelector('#csv-file');
    const file = new File(['Name,Email\nGuest Four,guest.four@test.local'], 'guests.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => screen.getByText('Import Guests'));
    fireEvent.click(screen.getByText('Import Guests'));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bulk'),
        expect.objectContaining({ method: 'POST' })
      )
    );
  });

  it('clears upload preview when Cancel is clicked', async () => {
    Papa.parse.mockImplementation((_file, opts) => {
      opts.complete({ data: [{ Name: 'Guest Five', Email: 'guest.five@test.local' }] });
    });

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const fileInput = document.querySelector('#csv-file');
    const file = new File(['Name,Email\nGuest Five,guest.five@test.local'], 'guests.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => screen.getByText('Guest Five'));

    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Guest Five')).not.toBeInTheDocument());
  });

  it('shows stat counts correctly', async () => {
    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));
    // 1 attending, 1 pending, 0 not attending
    const statCounts = screen.getAllByText('1');
    expect(statCounts.length).toBeGreaterThanOrEqual(2);
  });

  it('changes upload mode between merge and replace', async () => {
    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const replaceRadio = screen.getByDisplayValue('replace');
    const mergeRadio = screen.getByDisplayValue('merge');

    expect(mergeRadio).toBeChecked();
    fireEvent.click(replaceRadio);
    expect(replaceRadio).toBeChecked();
  });

  it('exports the current guest list as CSV', async () => {
    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;

    window.URL.createObjectURL = vi.fn(() => 'blob:guests-csv');
    window.URL.revokeObjectURL = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    const downloadLink = originalCreateElement('a');
    const clickSpy = vi.spyOn(downloadLink, 'click').mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (String(tagName).toLowerCase() === 'a') {
        return downloadLink;
      }
      return originalCreateElement(tagName);
    });

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    fireEvent.click(screen.getByRole('button', { name: /export guests csv/i }));

    expect(Papa.unparse).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        Name: 'Alice Smith',
        Email: 'alice@example.com'
      })
    ]));
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloadLink.download).toMatch(/guest-list-\d{4}-\d{2}-\d{2}\.csv/);
    expect(downloadLink.href).toBe('blob:guests-csv');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:guests-csv');

    createElementSpy.mockRestore();
    clickSpy.mockRestore();
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('updates RSVP status via dropdown and calls API', async () => {
    global.fetch = vi.fn((url, opts) => {
      if (opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockGuests[1], rsvp: 'Yes' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) });
    });

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Bob Jones'));

    const rsvpSelects = screen.getAllByRole('combobox');
    // Change the second guest's RSVP from 'Pending' to 'Yes'
    fireEvent.change(rsvpSelects[1], { target: { value: 'Yes' } });

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/guests/2'),
        expect.objectContaining({ method: 'PUT' })
      )
    );
  });

  it('deletes a guest when Delete is clicked and confirm is true', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    global.fetch = vi.fn((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1 }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) });
    });

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/guests/1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    );
    await waitFor(() => expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument());
  });

  it('does not delete when confirm returns false', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('opens EditGuestModal when Edit is clicked', async () => {
    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Guest')).toBeInTheDocument();
  });

  it('saves guest edits via API and closes edit modal', async () => {
    global.fetch = vi.fn((url, opts) => {
      if (opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockGuests[0], name: 'Alice Updated' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) });
    });

    render(<GuestManagementModal onClose={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice Smith'));

    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByText('Edit Guest')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Guest Name'), { target: { value: 'Alice Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.queryByText('Edit Guest')).not.toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/guests/1'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

    it('shows error when guest edit API fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn((url, opts) => {
        if (opts?.method === 'PUT') return Promise.resolve({ ok: false });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/Failed to update guest/i)
      );
      consoleSpy.mockRestore();
    });

    it('shows error when guest delete API fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      global.fetch = vi.fn((url, opts) => {
        if (opts?.method === 'DELETE') return Promise.resolve({ ok: false });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/Failed to delete guest/i)
      );
      consoleSpy.mockRestore();
    });

    it('shows error when RSVP update API fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn((url, opts) => {
        if (opts?.method === 'PUT') return Promise.resolve({ ok: false });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      const rsvpSelects = screen.getAllByRole('combobox');
      fireEvent.change(rsvpSelects[0], { target: { value: 'No' } });

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/Failed to update RSVP/i)
      );
      consoleSpy.mockRestore();
    });

    it('shows upload error when bulk import API fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      Papa.parse.mockImplementation((_file, opts) => {
        opts.complete({ data: [{ Name: 'Test User', Email: 'test@example.com' }] });
      });
      global.fetch = vi.fn((url) => {
        if (url.includes('/bulk')) return Promise.resolve({ ok: false });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGuests) });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      const fileInput = document.querySelector('#csv-file');
      fireEvent.change(fileInput, { target: { files: [new File(['Name,Email\nTest User,test@example.com'], 'guests.csv', { type: 'text/csv' })] } });
      await waitFor(() => screen.getByText('Import Guests'));
      fireEvent.click(screen.getByText('Import Guests'));

      await waitFor(() =>
        expect(screen.getByText(/Failed to import guests/i)).toBeInTheDocument()
      );
      consoleSpy.mockRestore();
    });

    it('shows error when CSV data is not a valid array', async () => {
      Papa.parse.mockImplementation((_file, opts) => {
        opts.complete({ data: null });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      const fileInput = document.querySelector('#csv-file');
      fireEvent.change(fileInput, { target: { files: [new File(['bad'], 'guests.csv', { type: 'text/csv' })] } });

      await waitFor(() =>
        expect(screen.getByText(/No valid guest data found/i)).toBeInTheDocument()
      );
    });

    it('shows validation error count when some rows have invalid email', async () => {
      Papa.parse.mockImplementation((_file, opts) => {
        opts.complete({
          data: [
            { Name: 'Good Person', Email: 'good@example.com' },
            { Name: 'Bad Person', Email: 'not-an-email' },
          ],
        });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      const fileInput = document.querySelector('#csv-file');
      fireEvent.change(fileInput, { target: { files: [new File(['Name,Email'], 'guests.csv', { type: 'text/csv' })] } });

      await waitFor(() => expect(screen.getByText('Good Person')).toBeInTheDocument());
      expect(screen.getByText(/1 validation error/i)).toBeInTheDocument();
    });

    it('parses RSVP "Attending" as Yes and derives guest count from legacy Plus One field', async () => {
      Papa.parse.mockImplementation((_file, opts) => {
        opts.complete({
          data: [{ Name: 'Tom Guest', Email: 'tom@example.com', RSVP: 'Attending', 'Plus One': 'Yes' }],
        });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      const fileInput = document.querySelector('#csv-file');
      fireEvent.change(fileInput, { target: { files: [new File([''], 'guests.csv', { type: 'text/csv' })] } });

      await waitFor(() => screen.getByText('Tom Guest'));
      expect(screen.getByText('tom@example.com')).toBeInTheDocument();
      // Legacy Plus One=Yes should now render guest count of 2 in preview.
      const rows = screen.getAllByRole('row');
      const guestRow = rows.find(row => row.textContent.includes('Tom Guest'));
      expect(guestRow.textContent).toContain('2');
    });

    it('shows "and X more guests" row when CSV preview exceeds 5 rows', async () => {
      const lotsOfData = Array.from({ length: 6 }, (_, i) => ({
        Name: `Guest ${i + 1}`,
        Email: `guest${i + 1}@example.com`,
      }));
      Papa.parse.mockImplementation((_file, opts) => {
        opts.complete({ data: lotsOfData });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      const fileInput = document.querySelector('#csv-file');
      fireEvent.change(fileInput, { target: { files: [new File(['Name,Email'], 'guests.csv', { type: 'text/csv' })] } });

      await waitFor(() => screen.getByText('Guest 1'));
      expect(screen.getByText(/1 more guest/i)).toBeInTheDocument();
    });

    it('parses address-book CSV headers and allows missing email', async () => {
      Papa.parse.mockImplementation((_file, opts) => {
        opts.complete({
          data: [
            {
              'First name': 'Sample One',
              'Last Name': 'Sample Two',
              Dependants: '',
              'Street address': '100 Example Ave',
              'Addtess Line 2': 'Unit 2',
              City: 'Exampletown',
              State: 'EX',
              Zip: '12345',
              Phone: '555-000-0000',
              Email: ''
            }
          ]
        });
      });

      render(<GuestManagementModal onClose={vi.fn()} />);
      await waitFor(() => screen.getByText('Alice Smith'));

      const fileInput = document.querySelector('#csv-file');
      fireEvent.change(fileInput, { target: { files: [new File([''], 'address-book.csv', { type: 'text/csv' })] } });

      await waitFor(() => screen.getByText('Sample One Sample Two'));
      // Email is now optional, so no fallback is generated when missing
      expect(screen.getByText(/100 Example Ave, Unit 2, Exampletown, EX 12345/i)).toBeInTheDocument();
    });
});

describe('AddGuestModal', () => {
  it('renders all form fields', () => {
    render(<AddGuestModal onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Guest Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText('RSVP Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Guest Count (including this guest)')).toBeInTheDocument();
  });

  it('calls onSave with form data on submit', () => {
    const onSave = vi.fn();
    render(<AddGuestModal onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Guest Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Guest Count (including this guest)'), { target: { value: '3' } });
    fireEvent.click(screen.getByText('Add Guest'));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jane Doe', email: 'jane@example.com', guestCount: 3, plusOne: true }));
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<AddGuestModal onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
