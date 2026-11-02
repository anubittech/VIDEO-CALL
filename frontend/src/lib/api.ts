const TOKEN_STORAGE_KEY = 'pulsemeet_auth_token';

/**
 * Dynamically resolves the Backend API & Signaling Server URL based on how
 * the user is accessing the application (localhost, LAN IP 192.168.x.x, or HTTPS gateway).
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location;
    // When accessed over HTTPS (e.g. mobile HTTPS gateway on port 3443 or tunnel), use same origin
    if (protocol === 'https:') {
      return origin;
    }
    // When accessed over HTTP via localhost or LAN IP (e.g. 192.168.20.12), connect to backend port 5000 on same host
    return `http://${hostname}:5000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://192.168.20.12:5000';
};

export const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setStoredToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const baseUrl = getApiBaseUrl();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (_networkError) {
    throw new ApiError(
      'Unable to reach the server. Please verify your device is on the same Wi-Fi/network and the backend service is running.',
      503
    );
  }

  let payload: { success?: boolean; message?: string; data?: T } = {};
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response
  }

  if (!response.ok || payload.success === false) {
    if (response.status === 401) {
      setStoredToken(null);
    }
    throw new ApiError(
      payload.message || `Request failed with status ${response.status}`,
      response.status
    );
  }

  return payload.data as T;
}
