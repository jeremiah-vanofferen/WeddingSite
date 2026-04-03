// Copyright 2026 Jeremiah Van Offeren
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublicPhotoUploadModal } from '../components/PublicPhotoUploadModal';

describe('PublicPhotoUploadModal', () => {
  let onSuccess;
  let onClose;
  let originalCreateObjectURL;

  const setSelectedFiles = (input, files) => {
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: files,
    });
  };

  beforeEach(() => {
    onSuccess = vi.fn();
    onClose = vi.fn();
    global.fetch = vi.fn();
    originalCreateObjectURL = window.URL.createObjectURL;
    window.URL.createObjectURL = vi.fn(() => 'blob:preview-photo');
  });

  afterEach(() => {
    if (originalCreateObjectURL) {
      window.URL.createObjectURL = originalCreateObjectURL;
      return;
    }

    delete window.URL.createObjectURL;
  });

  it('shows a validation error when submitted without a file', async () => {
    const { container } = render(<PublicPhotoUploadModal onSuccess={onSuccess} onClose={onClose} />);

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(screen.getByText('Please select an image file.')).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows and clears the preview as files are selected and removed', async () => {
    render(<PublicPhotoUploadModal onSuccess={onSuccess} onClose={onClose} />);

    const fileInput = screen.getByLabelText(/photo file/i);
    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });

    setSelectedFiles(fileInput, [file]);
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(window.URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByAltText(/preview/i)).toHaveAttribute('src', 'blob:preview-photo');

    setSelectedFiles(fileInput, []);
    fireEvent.change(fileInput, { target: { files: [] } });

    await waitFor(() => {
      expect(screen.queryByAltText(/preview/i)).not.toBeInTheDocument();
    });
  });

  it('submits the selected file and optional metadata successfully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { container } = render(<PublicPhotoUploadModal onSuccess={onSuccess} onClose={onClose} />);

    const fileInput = screen.getByLabelText(/photo file/i);
    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    setSelectedFiles(fileInput, [file]);
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/caption/i), { target: { value: 'Ceremony selfie' } });
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Jeremy' } });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/gallery/upload-file');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(window.FormData);
    expect(options.body.get('photo')).toBe(file);
    expect(options.body.get('caption')).toBe('Ceremony selfie');
    expect(options.body.get('submitterName')).toBe('Jeremy');
  });

  it('shows the API error and resets the button state when upload fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Image rejected' }),
    });

    const { container } = render(<PublicPhotoUploadModal onSuccess={onSuccess} onClose={onClose} />);

    const fileInput = screen.getByLabelText(/photo file/i);
    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    setSelectedFiles(fileInput, [file]);
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(screen.getByText('Image rejected')).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /submit photo/i })).toBeEnabled();
  });

  it('uses a fallback error message when the request rejects without a message', async () => {
    global.fetch.mockRejectedValueOnce({});

    const { container } = render(<PublicPhotoUploadModal onSuccess={onSuccess} onClose={onClose} />);

    const fileInput = screen.getByLabelText(/photo file/i);
    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    setSelectedFiles(fileInput, [file]);
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(screen.getByText('Upload failed. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows a network-specific error when fetch fails with a TypeError', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { container } = render(<PublicPhotoUploadModal onSuccess={onSuccess} onClose={onClose} />);

    const fileInput = screen.getByLabelText(/photo file/i);
    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    setSelectedFiles(fileInput, [file]);
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('closes from the overlay, the close button, and the cancel button', () => {
    const { container } = render(<PublicPhotoUploadModal onSuccess={onSuccess} onClose={onClose} />);

    fireEvent.click(container.querySelector('.gallery-modal-overlay'));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});