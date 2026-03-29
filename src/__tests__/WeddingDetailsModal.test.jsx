import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeddingDetailsModal, ViewDetailsModal } from '../components/WeddingDetailsModal';

const sampleDetails = {
  date: '2026-08-08',
  time: '16:00',
  location: 'Windpoint Lighthouse',
  address: '4725 Lighthouse Drive, Wind Point, WI 53402',
  description: 'A beautiful outdoor ceremony.',
};

describe('WeddingDetailsModal', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
  });

  it('renders all form fields with the provided details', () => {
    render(<WeddingDetailsModal details={sampleDetails} onSave={onSave} onClose={onClose} />);
    expect(screen.getByLabelText(/wedding date/i)).toHaveValue('2026-08-08');
    expect(screen.getByLabelText(/wedding time/i)).toHaveValue('16:00');
    expect(screen.getByLabelText(/venue name/i)).toHaveValue('Windpoint Lighthouse');
    expect(screen.getByLabelText(/venue address/i)).toHaveValue('4725 Lighthouse Drive, Wind Point, WI 53402');
    expect(screen.getByLabelText(/description/i)).toHaveValue('A beautiful outdoor ceremony.');
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
});

describe('ViewDetailsModal', () => {
  it('displays wedding details', () => {
    render(<ViewDetailsModal details={sampleDetails} onClose={vi.fn()} />);
    expect(screen.getByText('Windpoint Lighthouse')).toBeInTheDocument();
    expect(screen.getByText('4725 Lighthouse Drive, Wind Point, WI 53402')).toBeInTheDocument();
    expect(screen.getByText('A beautiful outdoor ceremony.')).toBeInTheDocument();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn();
    render(<ViewDetailsModal details={sampleDetails} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
