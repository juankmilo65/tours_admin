/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// Safe access to environment variables
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && 'ENV' in window && (window as any).ENV?.BACKEND_URL) {
    return (window as any).ENV.BACKEND_URL as string;
  }

  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BACKEND_URL) {
    return (import.meta as any).env.VITE_BACKEND_URL as string;
  }
  if (typeof process !== 'undefined' && process.env?.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  return 'http://localhost:3000';
};

const BASE_URL = getBaseUrl();

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'admin' | 'manager';
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: 'admin' | 'manager' | 'user';
      avatar?: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
    token: string;
  };
  error?: string;
  message?: string;
}

/**
 * Login user
 */
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    // eslint-disable-next-line no-undef
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = (await response.json()) as AuthResponse;

    if (!response.ok) {
      throw new Error(data.message ?? data.error ?? 'Login failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('An unexpected error occurred');
  }
};

/**
 * Register new user
 */
export const registerUser = async (userData: RegisterData): Promise<AuthResponse> => {
  try {
    // eslint-disable-next-line no-undef
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Language': 'es',
      },
      body: JSON.stringify({
        ...userData,
        role: userData.role ?? 'user', // Default to 'user' if not specified
      }),
    });

    const data = (await response.json()) as AuthResponse;

    if (!response.ok) {
      throw new Error(data.message ?? data.error ?? 'Registration failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('An unexpected error occurred');
  }
};

/**
 * Logout user
 */
export const logoutUser = async (token: string): Promise<void> => {
  try {
    // eslint-disable-next-line no-undef
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn('Logout request failed, but clearing local session anyway');
    }
  } catch (error) {
    // Even if the API call fails, we'll clear the local session
    console.warn('Logout API call failed, but clearing local session:', error);
  }
};
