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

export interface Category {
  id: string;
  slug: string;
  name_es: string;
  description_es?: string;
  name_en: string;
  description_en?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  isActive?: boolean | string;
  language?: string;
}

/**
 * Category item for dropdown (simplified version)
 */
export interface CategoryDropdownItem {
  id: string;
  slug: string;
  isActive: boolean;
  name_es: string;
  name_en: string;
}

/**
 * Response for categories dropdown endpoint
 */
export interface CategoryDropdownResponse {
  success: boolean;
  data: CategoryDropdownItem[];
}

/**
 * Get categories from backend API with pagination and filters
 */
export const getCategories = async (params: GetCategoriesParams = {}): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for categories');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  try {
    const { page = 1, limit = 10, isActive, language = 'es' } = params;

    // Build query parameters
    const queryParams: Record<string, string | number> = {
      page,
      limit,
    };

    if (isActive !== undefined && isActive !== '') {
      queryParams.isActive = isActive.toString();
    }

    const categoriesEndpoint = 'categories';
    const categoriesService = createServiceREST(BASE_URL, categoriesEndpoint, 'Bearer');

    const result = await categoriesService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCategories service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCategories service:', error);
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
 * Get category by ID from backend API
 */
export const getCategoryById = async (id: string, language = 'es'): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for category');
    return { success: false, data: null };
  }

  try {
    const categoryEndpoint = `categories/${id}`;
    const categoryService = createServiceREST(BASE_URL, categoryEndpoint, 'Bearer');

    const result = await categoryService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCategoryById service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCategoryById service:', error);
    }
    return { error, success: false, data: null };
  }
};

/**
 * DTO for creating a new category
 */
export interface CreateCategoryDto {
  name_es: string;
  name_en: string;
  slug: string;
  description_es?: string;
  description_en?: string;
  imageUrl?: string;
  isActive: boolean;
}

/**
 * Create a new category
 */
export const createCategory = async (
  data: CreateCategoryDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const categoriesEndpoint = 'categories';
  const categoriesService = createServiceREST(BASE_URL, categoriesEndpoint, `Bearer ${token}`);

  const result = await categoriesService.create(data, {
    headers: {
      'X-Language': language,
    },
  });
  return result;
};

/**
 * Upload an image for a category
 */
export const uploadCategoryImage = async (
  categoryId: string,
  imageFile: File,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  // We use direct axios call here because createServiceREST is optimized for JSON
  // and we need specific multipart/form-data handling with a custom path
  const formData = new FormData();
  formData.append('image', imageFile);

  try {
    const response = await axios.post(`${BASE_URL}/api/categories/${categoryId}/image`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        'X-Language': language,
      },
    });
    return response.data;
  } catch (error) {
    // Return error object consistent with other services
    // If axios error, extract response data if available
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};

/**
 * Update category data
 */
export const updateCategory = async (
  categoryId: string,
  data: Partial<CreateCategoryDto>,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const categoriesEndpoint = `categories/${categoryId}`;
  const categoriesService = createServiceREST(BASE_URL, 'categories', `Bearer ${token}`);

  const result = await categoriesService.update(data, {
    headers: {
      'X-Language': language,
    },
    url: `/${categoriesEndpoint}`,
  });
  return result;
};

/**
 * Toggle category status
 */
export const toggleCategoryStatus = async (
  categoryId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const categoriesEndpoint = `categories/${categoryId}/toggle-status`;
  const categoriesService = createServiceREST(BASE_URL, 'categories', `Bearer ${token}`);

  const result = await categoriesService.update(
    {},
    {
      headers: {
        'X-Language': language,
      },
      url: `/${categoriesEndpoint}`,
    }
  );
  return result;
};

/**
 * Get categories for dropdown (simplified list with only active categories)
 * Uses the /api/categories/dropdown endpoint
 */
export const getCategoriesDropdown = async (
  isActive = true,
  language = 'es'
): Promise<CategoryDropdownResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for categories dropdown');
    return { success: false, data: [] };
  }

  try {
    const queryParams: Record<string, string> = {};
    if (isActive !== undefined) {
      queryParams.isActive = isActive.toString();
    }

    const categoriesDropdownEndpoint = 'categories/dropdown';
    const categoriesService = createServiceREST(BASE_URL, categoriesDropdownEndpoint, 'Bearer');

    const result = await categoriesService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result as CategoryDropdownResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getCategoriesDropdown service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCategoriesDropdown service:', error);
    }
    return { success: false, data: [] };
  }
};
