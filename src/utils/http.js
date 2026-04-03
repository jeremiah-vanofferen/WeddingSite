// Copyright 2026 Jeremiah Van Offeren
import { API_BASE_URL } from './api';

export const getAuthHeaders = (headers = {}) => ({
  ...headers,
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

let publicAccessToken = '';
let publicTokenExpiresAt = 0;
let publicTokenRequest = null;

const isTestMode = import.meta.env.MODE === 'test';

const parseJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payloadJson = window.atob(normalized);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
};

async function fetchPublicAccessToken() {
  const response = await fetch(`${API_BASE_URL}/public/token`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to get public access token');
  }

  const data = await response.json().catch(() => null);
  if (!data?.token) {
    throw new Error('Failed to get public access token');
  }

  publicAccessToken = data.token;
  const payload = parseJwtPayload(publicAccessToken);
  publicTokenExpiresAt = payload?.exp ? payload.exp * 1000 : (Date.now() + 5 * 60 * 1000);

  return publicAccessToken;
}

export function clearPublicAccessToken() {
  publicAccessToken = '';
  publicTokenExpiresAt = 0;
  publicTokenRequest = null;
}

export async function getPublicAuthHeaders(headers = {}) {
  if (isTestMode) {
    return { ...headers };
  }

  if (publicAccessToken && Date.now() < (publicTokenExpiresAt - 30 * 1000)) {
    return {
      ...headers,
      Authorization: `Bearer ${publicAccessToken}`,
    };
  }

  if (!publicTokenRequest) {
    publicTokenRequest = fetchPublicAccessToken().finally(() => {
      publicTokenRequest = null;
    });
  }

  const token = await publicTokenRequest;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

export async function requestJson(url, options, fallbackError) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(fallbackError || 'Network error. Please try again.');
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error((data && data.error) || fallbackError || `Request failed with status ${response.status}`);
  }

  return data;
}