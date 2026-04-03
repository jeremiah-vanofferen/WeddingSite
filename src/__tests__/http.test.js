// Copyright 2026 Jeremiah Van Offeren
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthHeaders, requestJson } from '../utils/http';

describe('http utils', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('getAuthHeaders includes token and merges custom headers', () => {
    localStorage.setItem('authToken', 'abc123');

    const headers = getAuthHeaders({ 'Content-Type': 'application/json' });

    expect(headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc123',
    });
  });

  it('requestJson returns parsed data on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const data = await requestJson('/api/test', { method: 'GET' }, 'Request failed.');

    expect(data).toEqual({ success: true });
  });

  it('requestJson throws fallback error on network failure', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(requestJson('/api/test', { method: 'GET' }, 'Custom network error.'))
      .rejects.toThrow('Custom network error.');
  });

  it('requestJson throws API error message when response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request details' }),
    });

    await expect(requestJson('/api/test', { method: 'POST' }, 'Request failed.'))
      .rejects.toThrow('Bad request details');
  });

  it('requestJson falls back to status message when non-json error body is returned', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(requestJson('/api/test', { method: 'GET' }))
      .rejects.toThrow('Request failed with status 502');
  });
});
