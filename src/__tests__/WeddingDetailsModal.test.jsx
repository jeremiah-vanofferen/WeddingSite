// Copyright 2026 Jeremiah Van Offeren
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeddingDetailsModal, ViewDetailsModal } from '../components/WeddingDetailsModal';

const sampleDetails = {
  date: '2030-06-20',
  time: '16:00',
  timeZone: 'America/New_York',
  location: 'Celebration Venue',
  address: '123 Celebration Ave, Hometown, ST 12345',
  description: 'A beautiful outdoor ceremony.',
  registryUrl: 'https://www.example.com/registry',
};

describe('WeddingDetailsModal', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
  });

  it('renders all form fields with the provided details', () => {
    render(<WeddingDetailsModal details={sampleDetails} onSave={onSave} onClose={onClose} />);
    expect(screen.getByLabelText(/wedding date/i)).toHaveValue('2030-06-20');
    expect(screen.getByLabelText(/^wedding time$/i)).toHaveValue('16:00');
    expect(screen.getByLabelText(/wedding time zone/i)).toHaveValue('America/New_York');
    expect(screen.getByLabelText(/venue name/i)).toHaveValue('Celebration Venue');
    expect(screen.getByLabelText(/venue address/i)).toHaveValue('123 Celebration Ave, Hometown, ST 12345');
    expect(screen.getByLabelText(/description/i)).toHaveValue('A beautiful outdoor ceremony.');
    expect(screen.getByLabelText(/registry link/i)).toHaveValue('https://www.example.com/registry');
  });

  it('calls onSave with updated details when Save is clicked', async () => {
    render(<WeddingDetailsModal details={sampleDetails} onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/venue name/i), {
      target: { value: 'The Grand Hall' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].location).toBe('The Grand Hall');
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<WeddingDetailsModal details={sampleDetails} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('auto-fills the timezone from the address when it is blank', async () => {
    render(
      <WeddingDetailsModal
        details={{
          ...sampleDetails,
          timeZone: '',
          address: '100 Queen St W, Toronto, ON M5H 2N2, Canada',
        }}
        onSave={onSave}
        onClose={onClose}
      />
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/wedding time zone/i)).toHaveValue('America/Toronto')
    );
  });
});

describe('ViewDetailsModal', () => {
  it('displays wedding details', () => {
    render(<ViewDetailsModal details={sampleDetails} onClose={vi.fn()} />);
    expect(screen.getByText('Celebration Venue')).toBeInTheDocument();
    expect(screen.getByText('123 Celebration Ave, Hometown, ST 12345')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view our registry/i })).toBeInTheDocument();
    expect(screen.getByText('A beautiful outdoor ceremony.')).toBeInTheDocument();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn();
    render(<ViewDetailsModal details={sampleDetails} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
