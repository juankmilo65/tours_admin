/**
 * Users Service - API Integration for User Management
 */

import axios from 'axios';
import { createServiceREST } from './_index';

// Type declaration for Vite environment variables
interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

/**
 * User Types
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatarUrl?: string | null;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
}

export interface UsersResponse {
  success: boolean;
  data?: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface UserResponse {
  success: boolean;
  data?: User;
  message?: string;
  error?: { message?: string };
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  role?: string;
  search?: string;
  language?: string;
  token?: string;
}

/**
 * Get all users with filters and pagination
 */
export const getAllUsers = async (params: GetUsersParams = {}): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for users');
    return {
      success: false,
      data: {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      },
    };
  }

  try {
    const { page = 1, limit = 10, isActive, role, search, language = 'es', token } = params;

    // Build query params
    const queryParams: Record<string, string | number | boolean> = { page, limit };
    if (isActive !== undefined) {
      queryParams.isActive = isActive;
    }
    if (role !== undefined && role !== '') {
      queryParams.role = role;
    }
    if (search !== undefined && search !== '') {
      queryParams.search = search;
    }

    const usersEndpoint = 'users/all';
    const usersService = createServiceREST(
      BASE_URL,
      usersEndpoint,
      token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer'
    );

    const result = await usersService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getAllUsers service:', error);
    return {
      error,
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (
  id: string,
  token: string | undefined,
  language = 'es'
): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, data: null };
  }

  try {
    const userEndpoint = `users/${id}`;
    const userService = createServiceREST(
      BASE_URL,
      userEndpoint,
      token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer'
    );

    const result = await userService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getUserById service:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Create new user
 */
export const createUser = async (
  userData: CreateUserDto,
  token: string | undefined,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const usersEndpoint = 'users';
  const usersService = createServiceREST(
    BASE_URL,
    usersEndpoint,
    token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer'
  );

  const result = await usersService.create(userData, {
    headers: {
      'X-Language': language,
    },
  });
  return result;
};

/**
 * Update user data
 */
export const updateUser = async (
  userId: string,
  userData: Partial<UpdateUserDto>,
  token: string | undefined,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const usersEndpoint = `users/${userId}`;
  const usersService = createServiceREST(
    BASE_URL,
    'users',
    token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer'
  );

  const result = await usersService.update(userData, {
    headers: {
      'X-Language': language,
    },
    url: `/${usersEndpoint}`,
  });
  return result;
};

/**
 * Toggle user active status
 */
export const toggleUserStatus = async (
  userId: string,
  isActive: boolean,
  token: string | undefined,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const usersEndpoint = `users/${userId}`;
  const usersService = createServiceREST(
    BASE_URL,
    'users',
    token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer'
  );

  const result = await usersService.update(
    { isActive },
    {
      headers: {
        'X-Language': language,
      },
      url: `/${usersEndpoint}`,
    }
  );
  return result;
};

/**
 * Upload user avatar
 */
export const uploadUserAvatar = async (
  userId: string,
  imageFile: File,
  token: string | undefined,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  // We use direct axios call here because createServiceREST is optimized for JSON
  // and we need specific multipart/form-data handling with a custom path
  const formData = new FormData();
  formData.append('avatar', imageFile);

  try {
    const response = await axios.post(`${BASE_URL}/api/users/${userId}/avatar`, formData, {
      headers: {
        Authorization: token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer',
        'Content-Type': 'multipart/form-data',
        'X-Language': language,
      },
    });
    return response.data;
  } catch (error) {
    // Return error object consistent with other services
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};

/**
 * Delete user avatar
 */
export const deleteUserAvatar = async (
  userId: string,
  token: string | undefined,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.delete(`${BASE_URL}/api/users/${userId}/avatar`, {
      headers: {
        Authorization: token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer',
        'X-Language': language,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};
