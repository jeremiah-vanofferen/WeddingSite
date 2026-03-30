export const getAuthHeaders = (headers = {}) => ({
  ...headers,
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

export async function requestJson(url, options, fallbackError) {
  const response = await fetch(url, options);
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