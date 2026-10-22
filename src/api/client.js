/**
 * HTTP client with base URL and JWT handling
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (
  import.meta.env.PROD ? '' : 'http://localhost:4000'
);
const USE_API = import.meta.env.VITE_USE_API === 'true';

export function formatApiNetworkError(baseURL, error, pageOrigin = globalThis.location?.origin || '') {
  let safeBaseURL = String(baseURL || '');
  try {
    const parsed = new URL(safeBaseURL, pageOrigin || 'http://localhost');
    safeBaseURL = `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')}`;
  } catch {
    safeBaseURL = '(invalid API base URL)';
  }

  const apiOrigin = (() => {
    try { return new URL(baseURL, pageOrigin || 'http://localhost').origin; } catch { return ''; }
  })();
  const crossOrigin = Boolean(pageOrigin && apiOrigin && apiOrigin !== pageOrigin);
  const originalMessage = String(error?.message || '');
  const detail = /failed to fetch/i.test(originalMessage)
    ? 'Failed to fetch'
    : /networkerror/i.test(originalMessage)
      ? 'NetworkError'
      : /load failed/i.test(originalMessage)
        ? 'Load failed'
        : 'network error';
  const hint = crossOrigin
    ? `This may be a network failure or a CORS block for ${pageOrigin}; confirm that origin is in FRONTEND_ORIGIN.`
    : 'Check that the backend is running and reachable.';
  return `API unreachable: No response from ${safeBaseURL} (${detail}). ${hint}`;
}

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('auth_token');
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async request(endpoint, options = {}) {
    if (!USE_API) {
      throw new Error('API integration disabled (VITE_USE_API=false)');
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      throw new Error(formatApiNetworkError(this.baseURL, error));
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `Request failed with status ${response.status}` };
      }

      if (response.status === 401) {
        this.clearToken();
        localStorage.removeItem('user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
          window.location.assign('/auth');
        }
      }

      console.error('API client error response:', errorData);
      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  postBinary(endpoint, blob) {
    return this.request(endpoint, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type } });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export { USE_API };
