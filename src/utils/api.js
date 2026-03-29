const configuredApiUrl = import.meta.env.VITE_API_URL;

// Default to same-origin API so browser requests work in local and Docker proxy setups.
export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/+$/, '')
  : '/api';
