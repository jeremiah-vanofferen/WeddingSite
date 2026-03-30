import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Gallery from '../pages/Gallery';

vi.mock('../components/PublicPhotoUploadModal', () => ({
  PublicPhotoUploadModal: ({ onSuccess, onClose }) => (
    <div data-testid="public-upload-modal">
      <button onClick={onSuccess}>Mock Submit Upload</button>
      <button onClick={onClose}>Mock Close Upload</button>
    </div>
  )
}));

const approvedPhotos = [
  { id: 1, url: 'https://example.com/photo1.jpg', caption: 'Our first dance', submitter_name: 'Alice', uploaded_at: '2026-06-01T12:00:00Z' },
  { id: 2, url: 'https://example.com/photo2.jpg', caption: '', submitter_name: null, uploaded_at: '2026-06-02T08:00:00Z' },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(approvedPhotos) })
  );
});

describe('Gallery page', () => {
  it('renders the page heading', async () => {
    render(<Gallery />);
    expect(screen.getByText('Photo Gallery')).toBeInTheDocument();
  });

  it('shows loading then renders photo grid', async () => {
    render(<Gallery />);
    // Loading text should appear briefly then the grid loads
    await waitFor(() =>
      expect(screen.getByLabelText(/View photo: Our first dance/i)).toBeInTheDocument()
    );
  });

  it('renders all approved photos', async () => {
    render(<Gallery />);
    await waitFor(() => {
      const cards = screen.getAllByRole('button', { name: /view photo/i });
      expect(cards).toHaveLength(approvedPhotos.length);
    });
  });

  it('shows empty state when no approved photos', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    render(<Gallery />);
    await waitFor(() =>
      expect(screen.getByText(/no photos approved yet/i)).toBeInTheDocument()
    );
  });

  it('shows empty state on fetch error', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
    render(<Gallery />);
    await waitFor(() =>
      expect(screen.getByText(/no photos approved yet/i)).toBeInTheDocument()
    );
  });

  it('opens lightbox when a photo card is clicked', async () => {
    render(<Gallery />);
    const card = await screen.findByLabelText(/View photo: Our first dance/i);
    fireEvent.click(card);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-label', 'Our first dance');
  });

  it('closes lightbox when clicking the close button', async () => {
    render(<Gallery />);
    const card = await screen.findByLabelText(/View photo: Our first dance/i);
    fireEvent.click(card);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes lightbox when clicking the overlay backdrop', async () => {
    render(<Gallery />);
    const card = await screen.findByLabelText(/View photo: Our first dance/i);
    fireEvent.click(card);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the share photo button', async () => {
    render(<Gallery />);
    expect(await screen.findByRole('button', { name: /share photo/i })).toBeInTheDocument();
  });

  it('opens upload modal when clicking share photo', async () => {
    render(<Gallery />);
    fireEvent.click(await screen.findByRole('button', { name: /share photo/i }));
    expect(screen.getByTestId('public-upload-modal')).toBeInTheDocument();
  });

  it('shows success message after a successful upload callback', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(approvedPhotos) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(approvedPhotos) });

    render(<Gallery />);
    fireEvent.click(await screen.findByRole('button', { name: /share photo/i }));
    fireEvent.click(screen.getByRole('button', { name: /mock submit upload/i }));

    await waitFor(() =>
      expect(screen.getByText(/thank you/i)).toBeInTheDocument()
    );
  });

  it('closes modal via close callback', async () => {
    render(<Gallery />);
    fireEvent.click(await screen.findByRole('button', { name: /share photo/i }));
    expect(screen.getByTestId('public-upload-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /mock close upload/i }));
    expect(screen.queryByTestId('public-upload-modal')).not.toBeInTheDocument();
  });
});
