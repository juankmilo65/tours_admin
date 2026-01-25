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

// Simple cache implementation to avoid rate limiting
interface CacheEntry {
  data: CitiesResponse;
  timestamp: number;
}

const citiesCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

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
 * Generate cache key from params
 */
function getCacheKey(params: GetCitiesParams): string {
  const parts = [
    String(params.page ?? 1),
    String(params.limit ?? 10),
    params.countryId ?? '',
    String(params.isActive ?? ''),
    params.language ?? 'es',
  ];
  return parts.join('|');
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

  // Check cache first to avoid rate limiting
  const cacheKey = getCacheKey(params);
  const cachedEntry = citiesCache.get(cacheKey);
  const now = Date.now();

  if (cachedEntry !== undefined && now - cachedEntry.timestamp < CACHE_TTL) {
    console.log(
      '✅ [CITIES] Using cached data (cache age:',
      Math.floor((now - cachedEntry.timestamp) / 1000),
      'seconds)'
    );
    return cachedEntry.data;
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

    // Store in cache if successful
    const typedResult = result as CitiesResponse | { error: unknown };
    if (typedResult !== null && typeof typedResult === 'object' && !('error' in typedResult)) {
      citiesCache.set(cacheKey, {
        data: typedResult,
        timestamp: Date.now(),
      });
      console.log('✅ [CITIES] Data cached successfully');
    }

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCities service:', error.message);

      // Check for 429 Too Many Requests error
      if (error.message.includes('status code 429')) {
        console.warn('Rate limit exceeded (429) for cities. Please wait before retrying.');
        // Return cached data if available, even if expired
        if (cachedEntry !== undefined) {
          console.log('⚠️ [CITIES] Using stale cached data due to rate limit');
          return cachedEntry.data;
        }
        return {
          error: 'Rate limit exceeded. Please wait before retrying.',
          success: false,
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        };
      }

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
/**
 * DTO for creating a new city
 */
export interface CreateCityDto {
  name_es: string;
  name_en: string;
  slug: string;
  countryId: string;
  description_es: string;
  description_en: string;
  imageUrl: string;
  isActive: boolean;
}

/**
 * Create a new city
 */
export const createCity = async (
  data: CreateCityDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const citiesEndpoint = 'cities';
  // createServiceREST takes (url, endpoint, token). The token argument is used as the Authorization header value.
  const citiesService = createServiceREST(BASE_URL, citiesEndpoint, `Bearer ${token}`);

  const result = await citiesService.create(data, {
    headers: {
      'X-Language': language,
    },
  });
  return result;
};

/**
 * Upload an image for a city
 */
export const uploadCityImage = async (
  cityId: string,
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
    const response = await axios.post(`${BASE_URL}/api/cities/${cityId}/upload-image`, formData, {
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
 * Update city data
 */
export const updateCity = async (
  cityId: string,
  data: Partial<CreateCityDto>,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const citiesEndpoint = `cities/${cityId}`;
  const citiesService = createServiceREST(BASE_URL, 'cities', `Bearer ${token}`);

  const result = await citiesService.update(data, {
    headers: {
      'X-Language': language,
    },
    url: `/${citiesEndpoint}`,
  });
  return result;
};
