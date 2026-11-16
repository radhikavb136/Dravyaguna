/**
 * HTTP client with base URL and JWT handling
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (
  import.meta.env.PROD ? '' : 'http://localhost:4000'
);
const USE_API = import.meta.env.VITE_USE_API === 'true';

/** Resolved API base URL (from VITE_API_BASE_URL or dev/prod fallback). */
export function getApiBaseUrl() {
  return API_BASE_URL;
}

/** Routes that may load before login; do not hard-redirect to /auth on 401. */
const PUBLIC_AUTH_OPTIONAL_PATHS = new Set([
  '/',
  '/auth',
  '/password-reset',
  '/upgrade',
  '/payment',
  '/learn-more',
]);

export function shouldRedirectToAuthOn401(pathname = '') {
  const base = String(pathname || '').split('?')[0] || '';
  if (base === '/auth') return false;
  return !PUBLIC_AUTH_OPTIONAL_PATHS.has(base);
}

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
  return `Unable to connect to the server. ${hint} Please try again.`;
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
    const stored = localStorage.getItem('auth_token');
    if (!stored) {
      this.token = null;
      return null;
    }
    this.token = stored;
    return stored;
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
      throw new Error(formatApiNetworkError(this.baseURL, error), { cause: error });
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
        if (
          typeof window !== 'undefined' &&
          shouldRedirectToAuthOn401(window.location.pathname)
        ) {
          window.location.assign('/auth');
        }
      }

      console.error('API client error response:', errorData);
      let message = errorData.error || errorData.message;
      if (!message && errorData.database === 'unavailable') {
        message = 'Database service is currently unavailable. Please verify the database connection.';
      }
      if (!message) {
        if (response.status === 503) {
          message = 'Service temporarily unavailable. Please try again later.';
        } else if (response.status === 502) {
          message = 'Bad gateway. The server could not be reached.';
        } else if (response.status === 504) {
          message = 'Gateway timeout. The server took too long to respond.';
        } else {
          message = `Request failed with status ${response.status}`;
        }
      }
      const apiError = new Error(message);
      apiError.status = response.status;
      if (errorData.details) {
        apiError.details = errorData.details;
      }
      throw apiError;
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
