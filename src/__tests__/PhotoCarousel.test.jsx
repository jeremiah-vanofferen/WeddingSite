// Copyright 2026 Jeremiah Van Offeren
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoCarousel } from '../components/PhotoCarousel';

const featuredPhotos = [
  { id: 1, url: 'https://example.com/one.jpg', caption: 'First photo' },
  { id: 2, url: 'https://example.com/two.jpg', caption: 'Second photo' },
  { id: 3, url: 'https://example.com/three.jpg', caption: 'Third photo' },
];

describe('PhotoCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/public/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            carouselSpeed: '2',
            carouselTransition: 'fade',
          }),
        });
      }

      if (String(url).includes('/gallery/carousel/featured')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(featuredPhotos),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('changes photo on next click and resets autoplay timer', async () => {
    render(<PhotoCarousel />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();
    });

    // Start controlling timers only after initial data/render settles.
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();

    // Before full speed interval elapses after manual click, image should not auto-advance.
    await act(async () => {
      vi.advanceTimersByTime(1900);
    });
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();

    // At full interval from click, autoplay should advance once.
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('img', { name: 'Third photo' })).toBeInTheDocument();
  });

  it('handles rapid consecutive next/prev clicks without getting stuck', async () => {
    render(<PhotoCarousel />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();
    });

    vi.useFakeTimers();

    const nextBtn = screen.getByRole('button', { name: 'Next photo' });
    const prevBtn = screen.getByRole('button', { name: 'Previous photo' });

    // Rapid next clicks: click 3x quickly
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    // Fade mode allows all three clicks to execute immediately
    expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();

    // Single prev click should go backward
    fireEvent.click(prevBtn);
    expect(screen.getByRole('img', { name: 'Third photo' })).toBeInTheDocument();

    // Another rapid sequence: prev 2x
    fireEvent.click(prevBtn);
    fireEvent.click(prevBtn);
    expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();

    // Single next should advance
    fireEvent.click(nextBtn);
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();
  });

  it('handles rapid dot clicks without getting stuck', async () => {
    render(<PhotoCarousel />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();
    });

    vi.useFakeTimers();

    const dots = screen.getAllByRole('button', { name: /Go to photo/ });

    // Rapid clicks to slide 3, then 1, then 2
    fireEvent.click(dots[2]);
    fireEvent.click(dots[0]);
    fireEvent.click(dots[1]);

    // Should end at slide 2 (index 1)
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();

    // Click same dot multiple times in succession
    fireEvent.click(dots[1]);
    fireEvent.click(dots[1]);
    fireEvent.click(dots[1]);
    // Should still show slide 2
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();
  });

  it('keeps side buttons reliable in slide transition mode', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/public/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            carouselSpeed: '2',
            carouselTransition: 'slide',
          }),
        });
      }

      if (String(url).includes('/gallery/carousel/featured')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(featuredPhotos),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PhotoCarousel />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();
    });

    vi.useFakeTimers();

    const nextBtn = screen.getByRole('button', { name: 'Next photo' });
    const prevBtn = screen.getByRole('button', { name: 'Previous photo' });

    fireEvent.click(nextBtn);
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();

    // During active slide animation, additional side-button clicks should interrupt and continue navigation.
    fireEvent.click(nextBtn);
    expect(screen.getByRole('img', { name: 'Third photo' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(850);
    });

    fireEvent.click(prevBtn);
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();
  });

  it('supports rapid alternating side-button clicks in slide mode', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/public/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            carouselSpeed: '2',
            carouselTransition: 'slide',
          }),
        });
      }

      if (String(url).includes('/gallery/carousel/featured')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(featuredPhotos),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PhotoCarousel />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: 'Next photo' });
    const prevBtn = screen.getByRole('button', { name: 'Previous photo' });

    fireEvent.click(nextBtn);
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();

    // Rapidly alternate direction while animation is still in progress.
    fireEvent.click(prevBtn);
    expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();

    fireEvent.click(nextBtn);
    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();
  });

  it('falls back to safe autoplay speed when settings contain invalid speed', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/public/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            carouselSpeed: 'not-a-number',
            carouselTransition: 'slide',
          }),
        });
      }

      if (String(url).includes('/gallery/carousel/featured')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(featuredPhotos),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PhotoCarousel />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();
    });

    vi.useFakeTimers();

    const nextBtn = screen.getByRole('button', { name: 'Next photo' });
    const prevBtn = screen.getByRole('button', { name: 'Previous photo' });

    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(prevBtn);

    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();
  });

  it('responds on the first side-button press', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/public/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            carouselSpeed: '2',
            carouselTransition: 'slide',
          }),
        });
      }

      if (String(url).includes('/gallery/carousel/featured')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(featuredPhotos),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PhotoCarousel />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();
    });

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Next photo' }));

    expect(screen.getByRole('img', { name: 'Second photo' })).toBeInTheDocument();
  });

  it('shows a photo empty state when no featured images are available', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/public/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            carouselSpeed: '2',
            carouselTransition: 'fade',
          }),
        });
      }

      if (String(url).includes('/gallery/carousel/featured')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PhotoCarousel />);

    await waitFor(() => {
      expect(screen.getByText('No Photos Yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Photos will appear here once they are uploaded.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
