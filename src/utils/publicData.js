import { API_BASE_URL } from './api';

export async function fetchJsonOrFallback(path, fallbackValue, options) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
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