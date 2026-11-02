import { apiRequest, setStoredToken } from '../lib/api';
import { User } from '../lib/types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

interface AuthData {
  user: User;
  token: string;
}

export const authService = {
  async register(input: RegisterInput): Promise<User> {
    const data = await apiRequest<AuthData>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data.user;
  },

  async login(input: LoginInput): Promise<User> {
    const data = await apiRequest<AuthData>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      setStoredToken(null);
    }
  },

  async getCurrentUser(): Promise<User> {
    const data = await apiRequest<{ user: User }>('/api/auth/me', {
      method: 'GET',
    });
    return data.user;
  },
};

