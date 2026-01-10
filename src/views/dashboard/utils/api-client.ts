/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

export const apiClientJs = `
const API_BASE = '/dashboard/api/v1';

class ApiClient {
  constructor() {
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }

  getAuthToken() {
    // Try to get from cookie first
    const cookies = document.cookie.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('session_token='));
    if (sessionCookie) {
      return sessionCookie.substring('session_token='.length);
    }
    // Fallback to localStorage
    return localStorage.getItem('auth_token') || '';
  }

  getRefreshToken() {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const refreshCookie = cookies.find(c => c.startsWith('refresh_token='));
    if (refreshCookie) {
      return refreshCookie.substring('refresh_token='.length);
    }
    return null;
  }

  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await fetch(API_BASE + '/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        
        if (!response.ok) {
          throw new Error('Token refresh failed');
        }
        
        const data = await response.json();
        // Cookies are automatically set by the server
        // Update localStorage if used
        if (data.data?.token) {
          localStorage.setItem('auth_token', data.data.token);
        }
        
        return data.data?.token;
      } catch (error) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('auth_token');
        document.cookie = 'session_token=; Path=/; Max-Age=0';
        document.cookie = 'refresh_token=; Path=/; Max-Age=0';
        window.location.href = '/dashboard/login';
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();
    
    return this.refreshPromise;
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const token = this.getAuthToken();
    let response;

    // Ensure headers object exists
    options.headers = options.headers || {};
    
    try {
      const fetchOptions = {
        ...options,
        credentials: 'include', // Include cookies
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': 'Bearer ' + token, 
          'X-CSRF-Token': this.getCsrfToken(),
          ...options.headers 
        },
      };

      response = await fetch(API_BASE + endpoint, fetchOptions);
    } catch (networkError) {
      // Handle network errors (no connection, CORS, etc.)
      throw new Error('Network error: Unable to connect to server. Please check your connection.');
    }

    if (!response.ok) { 
      // If unauthorized, try to refresh token (only once)
      if (response.status === 401 && retryCount === 0) {
        try {
          await this.refreshAccessToken();
          // Retry the original request with new token
          return this.request(endpoint, options, retryCount + 1);
        } catch (error) {
          // Refresh failed, will redirect to login (handled in refreshAccessToken)
          return;
        }
      }
      
      // If still unauthorized after refresh, or other error
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        document.cookie = 'session_token=; Path=/; Max-Age=0';
        document.cookie = 'refresh_token=; Path=/; Max-Age=0';
        window.location.href = '/dashboard/login';
        return undefined; // Explicitly return undefined
      }
      
      
      // Try to parse error response
      let errorMessage = 'API request failed';
      try {
        const error = await response.json(); 
        // Try multiple possible error message locations
        errorMessage = error.error?.message || 
                      error.error || 
                      error.message || 
                      JSON.stringify(error) || 
                      errorMessage;
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        try {
          const text = await response.text();
          errorMessage = text || response.statusText || 'Unknown error';
        } catch {
          const statusText = response.statusText || 'Unknown error';
          const statusCode = response.status || 0;
          errorMessage = statusText + ' (HTTP ' + statusCode + ')';
        }
      }
      throw new Error(errorMessage); 
    }

    return response.json();
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient();
// Alias for backward compatibility during refactor
const apiRequest = (endpoint, options, retryCount) => apiClient.request(endpoint, options, retryCount);
// Export auth helpers if needed globally (optional, but good for backward compat if used elsewhere)
const getAuthToken = () => apiClient.getAuthToken();
`;
