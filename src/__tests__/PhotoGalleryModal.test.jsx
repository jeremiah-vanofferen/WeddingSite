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
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
    );
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

  it('calls delete endpoint and onSave with updated list when a photo is deleted', async () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gallery/1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 2 })])
    );
    expect(onSave.mock.calls[0][0]).toHaveLength(1);
  });

  it('toggles featured status and calls onSave', async () => {
    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ ...samplePhotos[0], featured: false }) })
    );
    // "Unfeature" button is for the featured photo (id: 1)
    fireEvent.click(screen.getByRole('button', { name: /unfeature/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/gallery/1/featured'),
      expect.objectContaining({ method: 'PUT' })
    );
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
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, photo: { id: 9, url: '/uploads/photo.jpg', caption: 'New Photo' } })
      })
    );
    window.URL.createObjectURL = vi.fn(() => 'blob:preview-photo');
  });

  it('renders file, caption, and submitter fields', () => {
    render(<AddPhotoModal onSave={onSave} onClose={onClose} />);
    expect(screen.getByLabelText(/photo file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submitter name/i)).toBeInTheDocument();
  });

  it('calls upload endpoint and onSave with returned photo when Add Photo is clicked', async () => {
    render(<AddPhotoModal onSave={onSave} onClose={onClose} />);

    const file = new File(['mock-image'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/photo file/i), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/caption/i), {
      target: { value: 'New Photo' },
    });
    fireEvent.change(screen.getByLabelText(/submitter name/i), {
      target: { value: 'Admin' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add photo/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gallery/upload-file-admin'),
        expect.objectContaining({ method: 'POST' })
      )
    );
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 9, url: '/uploads/photo.jpg' }));
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<AddPhotoModal onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows image preview when file is selected', async () => {
    render(<AddPhotoModal onSave={onSave} onClose={onClose} />);
    const file = new File(['preview-image'], 'preview.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/photo file/i), { target: { files: [file] } });
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
    global.fetch = vi.fn((url, options) => {
      if (String(url).includes('/api/gallery/1') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            url: 'https://example.com/photo1.jpg',
            caption: 'Updated Caption',
            featured: true,
          }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    });

    render(<PhotoGalleryModal photos={samplePhotos} onSave={onSave} onClose={onClose} />);
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    fireEvent.change(screen.getByLabelText(/caption/i), { target: { value: 'Updated Caption' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gallery/1'),
        expect.objectContaining({ method: 'PUT' })
      )
    );

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
