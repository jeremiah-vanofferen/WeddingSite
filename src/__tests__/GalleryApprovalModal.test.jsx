import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GalleryApprovalModal from '../components/GalleryApprovalModal';

const pendingPhotos = [
  {
    id: 1,
    url: '/uploads/photo1.jpg',
    caption: 'Ceremony moment',
    submitter_name: 'Alice',
    uploaded_at: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 2,
    url: '/uploads/photo2.jpg',
    caption: '',
    submitter_name: null,
    uploaded_at: '2026-06-02T12:00:00.000Z',
  },
];

describe('GalleryApprovalModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
    global.fetch = vi.fn((url, options) => {
      if (String(url).includes('/gallery/pending') && (!options || options.method === undefined)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(pendingPhotos) });
      }
      if (String(url).includes('/gallery/') && String(url).includes('/status') && options?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('loads and renders pending submissions', async () => {
    render(<GalleryApprovalModal onClose={onClose} />);

    expect(await screen.findByText('Ceremony moment')).toBeInTheDocument();
    expect(screen.getByText(/Submitted by: Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/No caption/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no pending submissions', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));

    render(<GalleryApprovalModal onClose={onClose} />);

    expect(await screen.findByText(/No pending submissions/i)).toBeInTheDocument();
  });

  it('approves a photo and removes it from the list', async () => {
    render(<GalleryApprovalModal onClose={onClose} />);

    await screen.findByText('Ceremony moment');
    const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gallery/1/status'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Ceremony moment')).not.toBeInTheDocument();
    });
  });

  it('shows action error when approve/reject request fails', async () => {
    global.fetch = vi.fn((url, options) => {
      if (String(url).includes('/gallery/pending') && (!options || options.method === undefined)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([pendingPhotos[0]]) });
      }
      if (String(url).includes('/gallery/') && String(url).includes('/status') && options?.method === 'PUT') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Action failed from API' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<GalleryApprovalModal onClose={onClose} />);

    await screen.findByText('Ceremony moment');
    fireEvent.click(screen.getByRole('button', { name: /Reject/i }));

    expect(await screen.findByText(/Action failed from API/i)).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', async () => {
    render(<GalleryApprovalModal onClose={onClose} />);

    await screen.findByText('Ceremony moment');
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
