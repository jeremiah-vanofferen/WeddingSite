import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoGalleryModal, AddPhotoModal } from '../components/PhotoGalleryModal';

const samplePhotos = [
  { id: 1, url: 'https://example.com/photo1.jpg', caption: 'Engagement', featured: true },
  { id: 2, url: 'https://example.com/photo2.jpg', caption: 'Venue', featured: false },
];

describe('PhotoGalleryModal', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders all photos with captions', () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Engagement')).toBeInTheDocument();
    expect(screen.getByText('Venue')).toBeInTheDocument();
  });

  it('shows featured badge on featured photos', () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('calls onSave with updated list when a photo is deleted', () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 2 })])
    );
    expect(onSave.mock.calls[0][0]).toHaveLength(1);
  });

  it('toggles featured status and calls onSave', () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    // "Unfeature" button is for the featured photo (id: 1)
    fireEvent.click(screen.getByRole('button', { name: /unfeature/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1, featured: false })])
    );
  });

  it('calls onClose when Close is clicked', () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AddPhotoModal', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
  });

  it('renders photo URL, caption, and featured fields', () => {
    render(<AddPhotoModal onSave={onSave} onClose={onClose} />);
    expect(screen.getByLabelText(/photo url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/feature this photo/i)).toBeInTheDocument();
  });

  it('calls onSave with form data when Add Photo is clicked', async () => {
    render(<AddPhotoModal onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/photo url/i), {
      target: { value: 'https://example.com/new.jpg' },
    });
    fireEvent.change(screen.getByLabelText(/caption/i), {
      target: { value: 'New Photo' },
    });
    fireEvent.click(screen.getByLabelText(/feature this photo/i));

    fireEvent.click(screen.getByRole('button', { name: /add photo/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      url: 'https://example.com/new.jpg',
      caption: 'New Photo',
      featured: true,
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<AddPhotoModal onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows image preview when URL is entered', async () => {
    render(<AddPhotoModal onSave={onSave} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/photo url/i), {
      target: { value: 'https://example.com/preview.jpg' },
    });
    await waitFor(() => expect(screen.getByText(/Preview:/i)).toBeInTheDocument());
  });
});

describe('EditPhotoModal (via PhotoGalleryModal)', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('opens EditPhotoModal when Edit is clicked', () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);
    expect(screen.getByText('Edit Photo')).toBeInTheDocument();
  });

  it('saves edited photo and closes edit modal', async () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    fireEvent.change(screen.getByLabelText(/caption/i), { target: { value: 'Updated Caption' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.queryByText('Edit Photo')).not.toBeInTheDocument());
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ caption: 'Updated Caption' })])
    );
  });

  it('closes EditPhotoModal when Cancel is clicked', () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByText('Edit Photo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('Edit Photo')).not.toBeInTheDocument();
  });
});
