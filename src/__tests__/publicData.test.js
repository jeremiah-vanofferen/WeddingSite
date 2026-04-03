// Copyright 2026 Jeremiah Van Offeren
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJsonOrFallback } from '../utils/publicData';

describe('publicData helpers', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('retries once when public request is unauthorized and then succeeds', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

    const data = await fetchJsonOrFallback('/public/settings', null);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(data).toEqual({ ok: true });
  });

  it('returns fallback when retry still fails', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) })
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) });

    const data = await fetchJsonOrFallback('/public/settings', { fallback: true });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(data).toEqual({ fallback: true });
  });
});
