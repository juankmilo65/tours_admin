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

export interface City {
  id: string;
  slug: string;
  name_es: string;
  description_es: string;
  name_en: string;
  description_en: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  countryId: string;
}

export interface CitiesResponse {
  success: boolean;
  data: City[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetCitiesParams {
  page?: number;
  limit?: number;
  countryId?: string;
  isActive?: boolean | string;
  language?: string;
}

/**
 * Get cities from backend API with pagination and filters
 */
export const getCities = async (params: GetCitiesParams = {}): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for cities');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  try {
    const { page = 1, limit = 10, countryId, isActive, language = 'es' } = params;

    // Build query parameters
    const queryParams: Record<string, string | number> = {
      page,
      limit,
    };

    if (countryId !== undefined && countryId !== '') {
      queryParams.countryId = countryId;
    }

    if (isActive !== undefined && isActive !== '') {
      queryParams.isActive = isActive.toString();
    }

    const citiesEndpoint = 'cities';
    const citiesService = createServiceREST(BASE_URL, citiesEndpoint, 'Bearer');

    const result = await citiesService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCities service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCities service:', error);
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
 * Get cities from backend API by countryId (legacy - kept for backward compatibility)
 * @deprecated Use getCities with countryId parameter instead
 */
export const getCitiesByCountryId = (countryId: string, language = 'es'): Promise<unknown> => {
  return getCities({ countryId, language });
};
