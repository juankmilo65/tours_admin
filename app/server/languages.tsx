import { createServiceREST } from './_index';
import axios from 'axios';

// Type declaration for Vite environment variables
interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export interface LanguageOption {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Response for languages dropdown endpoint
 */
export interface LanguagesDropdownResponse {
  success: boolean;
  data: LanguageOption[];
}

/**
 * Response for languages list endpoint
 */
export interface LanguagesListResponse {
  success: boolean;
  data: LanguageOption[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get languages for dropdown (simplified list)
 * Uses by /api/languages/dropdown endpoint
 */
export const getLanguagesDropdown = async (language = 'es'): Promise<LanguagesDropdownResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for languages dropdown');
    return { success: false, data: [] };
  }

  try {
    const languagesDropdownEndpoint = 'languages/dropdown';
    const languagesService = createServiceREST(BASE_URL, languagesDropdownEndpoint, '');

    const result = await languagesService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result as LanguagesDropdownResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getLanguagesDropdown service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getLanguagesDropdown service:', error);
    }
    return { success: false, data: [] };
  }
};

/**
 * Get languages list with filters
 * @param params - Query parameters for filtering
 * @returns Languages list with pagination
 */
export const getLanguages = async (params: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  language?: string;
}): Promise<LanguagesListResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for languages');
    return { success: false, data: [] };
  }

  try {
    const endpoint = 'languages';
    const languagesService = createServiceREST(BASE_URL, endpoint, '');

    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const result = await languagesService.get({
      params: Object.fromEntries(queryParams),
      headers: {
        'X-Language': params.language ?? 'es',
      },
    });

    return result as LanguagesListResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getLanguages service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getLanguages service:', error);
    }
    return { success: false, data: [] };
  }
};

/**
 * Create language
 * @param data - Language data to create
 * @param token - Auth token
 * @param language - Current language
 * @returns Created language
 */
export const createLanguage = async (
  data: {
    code: string;
    name_es: string;
    name_en: string;
    isActive?: boolean;
  },
  token: string,
  language = 'es'
): Promise<{ success: boolean; data?: LanguageOption; message?: string; error?: unknown }> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const endpoint = 'languages';
    const languagesService = createServiceREST(BASE_URL, endpoint, token);

    const result = await languagesService.create(data, {
      headers: {
        'X-Language': language,
      },
    });

    return result as {
      success: boolean;
      data?: LanguageOption;
      message?: string;
      error?: unknown;
    };
  } catch (error) {
    console.error('Error in createLanguage service:', error);
    return { success: false, error };
  }
};

/**
 * Update language
 * @param id - Language ID
 * @param data - Language data to update
 * @param token - Auth token
 * @param language - Current language
 * @returns Updated language
 *
 * Example:
 * PUT /api/languages/{language_id}
 * Body: { "code": "es", "name_es": "Español", "name_en": "Spanish" }
 */
export const updateLanguage = async (
  id: string,
  data: {
    code?: string;
    name_es?: string;
    name_en?: string;
    isActive?: boolean;
  },
  token: string,
  language = 'es'
): Promise<{ success: boolean; message?: string; error?: unknown }> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    // Use direct axios call for PUT method with ID in URL
    const response = await axios.put(`${BASE_URL}/api/languages/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Language': language,
      },
    });

    return response.data as {
      success: boolean;
      message?: string;
      error?: unknown;
    };
  } catch (error) {
    console.error('Error in updateLanguage service:', error);
    // If axios error, extract response data if available
    if (axios.isAxiosError(error) && error.response) {
      return { success: false, error: error.response.data as unknown };
    }
    return { success: false, error };
  }
};
