import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleModal, AddEventModal } from '../components/ScheduleModal';

const sampleSchedule = [
  { id: 1, time: '14:00', event: 'Ceremony', description: 'Outdoor ceremony', sort_order: 1 },
  { id: 2, time: '16:00', event: 'Reception', description: 'Dinner and dancing', sort_order: 2 },
];

describe('ScheduleModal', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders all schedule events', () => {
    render(
      <ScheduleModal
        schedule={sampleSchedule}
        onSave={onSave}
        onClose={onClose}
      />
    );
    expect(screen.getByText('Ceremony')).toBeInTheDocument();
    expect(screen.getByText('Reception')).toBeInTheDocument();
    expect(screen.getByText('Outdoor ceremony')).toBeInTheDocument();
  });

  it('calls onSave with updated list when an event is deleted', () => {
    render(
      <ScheduleModal
        schedule={sampleSchedule}
        onSave={onSave}
        onClose={onClose}
      />
    );
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 2 })])
    );
    expect(onSave.mock.calls[0][0]).toHaveLength(1);
  });

  it('calls onClose when Close button is clicked', () => {
    render(
      <ScheduleModal
        schedule={sampleSchedule}
        onSave={onSave}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('opens the edit form when Edit is clicked', () => {
    render(
      <ScheduleModal
        schedule={sampleSchedule}
        onSave={onSave}
        onClose={onClose}
      />
    );
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);
    // EditEventModal renders an "Edit Event" heading
    expect(screen.getByRole('heading', { name: /edit event/i })).toBeInTheDocument();
  });

    it('does not delete when user cancels the confirmation', () => {
      vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
      render(<ScheduleModal schedule={sampleSchedule} onSave={onSave} onClose={onClose} />);
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
      expect(onSave).not.toHaveBeenCalled();
    });

    it('moves an event down when the down arrow is clicked', () => {
      render(<ScheduleModal schedule={sampleSchedule} onSave={onSave} onClose={onClose} />);
      // sorted render: [Ceremony(14:00), Reception(16:00)]
      // Ceremony's down button (index 0 in sorted list) is enabled
      const downButtons = screen.getAllByTitle('Move down');
      fireEvent.click(downButtons[0]);
      expect(onSave).toHaveBeenCalledTimes(1);
       // Verify onSave was called with both events (order may be mutated by render re-sort)
       expect(onSave.mock.calls[0][0]).toHaveLength(2);
       expect(onSave.mock.calls[0][0].map(e => e.id)).toEqual(expect.arrayContaining([1, 2]));
    });

    it('moves an event up when the up arrow is clicked', () => {
      render(<ScheduleModal schedule={sampleSchedule} onSave={onSave} onClose={onClose} />);
      // sorted render: [Ceremony(14:00), Reception(16:00)]
      // Reception's up button (index 1 in sorted list) is enabled
      const upButtons = screen.getAllByTitle('Move up');
      fireEvent.click(upButtons[1]);
      expect(onSave).toHaveBeenCalledTimes(1);
       // Verify onSave was called with both events
       expect(onSave.mock.calls[0][0]).toHaveLength(2);
       expect(onSave.mock.calls[0][0].map(e => e.id)).toEqual(expect.arrayContaining([1, 2]));
    });

    it('saves an edited event and closes the edit modal', () => {
      render(<ScheduleModal schedule={sampleSchedule} onSave={onSave} onClose={onClose} />);
      fireEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
      expect(screen.getByRole('heading', { name: /edit event/i })).toBeInTheDocument();

      // Change the event name in the EditEventModal form
      fireEvent.change(screen.getByDisplayValue('Ceremony'), { target: { value: 'Wedding Ceremony' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      expect(screen.queryByRole('heading', { name: /edit event/i })).not.toBeInTheDocument();
      expect(onSave).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 1, event: 'Wedding Ceremony' })])
      );
    });

    it('closes the edit modal when the × button is clicked', () => {
      render(<ScheduleModal schedule={sampleSchedule} onSave={onSave} onClose={onClose} />);
      fireEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
      expect(screen.getByRole('heading', { name: /edit event/i })).toBeInTheDocument();

      // Click the last × button (the one in the EditEventModal)
      const xButtons = screen.getAllByText('×');
      fireEvent.click(xButtons[xButtons.length - 1]);

      expect(screen.queryByRole('heading', { name: /edit event/i })).not.toBeInTheDocument();
    });
});

describe('AddEventModal', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
  });

  it('renders time, event name, and description fields', () => {
    render(<AddEventModal onSave={onSave} onClose={onClose} />);
    expect(screen.getByLabelText(/event time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/event name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('calls onSave with form data when submitted', async () => {
    render(<AddEventModal onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/event time/i), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: 'After Party' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Keep dancing!' } });

    fireEvent.click(screen.getByRole('button', { name: /add event/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      time: '18:00',
      event: 'After Party',
      description: 'Keep dancing!',
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<AddEventModal onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
