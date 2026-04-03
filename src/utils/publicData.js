// Copyright 2026 Jeremiah Van Offeren
import { API_BASE_URL } from './api';
import { clearPublicAccessToken, getPublicAuthHeaders } from './http';

export async function fetchJsonOrFallback(path, fallbackValue, options) {
  try {
    const url = `${API_BASE_URL}${path}`;
    const headers = await getPublicAuthHeaders(options?.headers || {});
    let response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      clearPublicAccessToken();
      const retryHeaders = await getPublicAuthHeaders(options?.headers || {});
      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    }

    if (!response.ok) {
      return fallbackValue;
    }

    const data = await response.json();
    return data ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

export async function fetchArray(path, options) {
  const data = await fetchJsonOrFallback(path, [], options);
  return Array.isArray(data) ? data : [];
}

export async function fetchPublicSettings() {
  const data = await fetchJsonOrFallback('/public/settings', null);
  return data && !data.error ? data : null;
}

export async function fetchGuestLookupSuggestions() {
  const data = await fetchJsonOrFallback('/public/guest-lookup', { field: 'name', suggestions: [] });
  const field = data?.field === 'email' ? 'email' : 'name';
  const suggestions = Array.isArray(data?.suggestions)
    ? data.suggestions
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
    : [];

  return { field, suggestions };
}

export async function fetchGuestNames() {
  const { field, suggestions } = await fetchGuestLookupSuggestions();
  return field === 'name' ? suggestions : [];
}