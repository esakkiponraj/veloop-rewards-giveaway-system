const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Generate or retrieve persistent client device hash for anti-abuse signal
export const getDeviceHash = () => {
  let deviceHash = localStorage.getItem('veloop_device_hash');
  if (!deviceHash) {
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    deviceHash = `DEV-${Date.now()}-${randomBytes}`;
    localStorage.setItem('veloop_device_hash', deviceHash);
  }
  return deviceHash;
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('veloop_auth_token');
  const deviceHash = getDeviceHash();

  const headers = {
    'Content-Type': 'application/json',
    'x-device-hash': deviceHash,
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.code = data.code || 'UNKNOWN_ERROR';
      error.status = response.status;
      error.details = data.details || null;
      throw error;
    }

    return data;
  } catch (error) {
    // Standardize error propagation
    if (!error.code) {
      error.code = 'NETWORK_ERROR';
      error.message = 'Unable to connect to VELOOP backend server. Please verify backend is running.';
    }
    throw error;
  }
};

export const apiClient = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export default apiClient;
