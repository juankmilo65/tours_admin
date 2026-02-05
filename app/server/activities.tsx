/**
 * Activities Service - API calls for activity management
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

export interface ActivityCategory {
  id: string;
  slug: string;
  name_es: string;
  description_es: string | null;
  name_en: string;
  description_en: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  activityEs: string;
  activityEn: string;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: ActivityCategory;
  categories: string[];
}

export interface ActivityResponse {
  success: boolean;
  data: Activity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetActivitiesParams {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean | string;
  language?: string;
}

export interface CreateActivityDto {
  activityEs: string;
  activityEn: string;
  categoryId: string; // Category UUID
  isActive: boolean;
}

export interface UpdateActivityDto {
  activityEs?: string;
  activityEn?: string;
  categoryId?: string; // Category UUID
  isActive?: boolean;
}

/**
 * Get activities from backend API with pagination and filters
 */
export const getActivities = async (params: GetActivitiesParams = {}): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for activities');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  try {
    const { page = 1, limit = 10, category, isActive, language = 'es' } = params;

    const queryParams: Record<string, string | number> = {
      page,
      limit,
    };

    if (category !== undefined && category !== '') {
      queryParams.category = category;
    }

    if (isActive !== undefined && isActive !== '') {
      queryParams.isActive = isActive.toString();
    }

    const activitiesEndpoint = 'activities';
    const activitiesService = createServiceREST(BASE_URL, activitiesEndpoint, 'Bearer');

    const result = await activitiesService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getActivities service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getActivities service:', error);
    }
    return {
      error,
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
};

/**
 * Get activity by ID from backend API
 */
export const getActivityById = async (id: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for activity');
    return { success: false, data: null };
  }

  try {
    const activityEndpoint = `activities/${id}`;
    const activityService = createServiceREST(BASE_URL, activityEndpoint, 'Bearer');

    const result = await activityService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getActivityById service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getActivityById service:', error);
    }
    return { error, success: false, data: null };
  }
};

/**
 * Create a new activity
 */
export const createActivity = async (
  data: CreateActivityDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const activitiesEndpoint = 'activities';
  const activitiesService = createServiceREST(BASE_URL, activitiesEndpoint, `Bearer ${token}`);

  const result = await activitiesService.create(data, {
    headers: {
      'X-Language': language,
    },
  });
  return result;
};

/**
 * Update activity data
 */
export const updateActivity = async (
  activityId: string,
  data: UpdateActivityDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.put(`${BASE_URL}/api/activities/${activityId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
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

/**
 * Delete an activity (soft delete)
 */
export const deleteActivity = async (
  activityId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.delete(`${BASE_URL}/api/activities/${activityId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
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

/**
 * Toggle activity active status
 */
export const toggleActivityStatus = async (
  activityId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.patch(
      `${BASE_URL}/api/activities/${activityId}/toggle-status`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Language': language,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};
