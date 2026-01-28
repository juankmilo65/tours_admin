import { createServiceREST } from './_index';
import type { ServicePayload } from '../types/PayloadTourDataProps';

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
 * Get tour by ID from backend API
 */
export const getTourById = async (
  id: string,
  language = 'es',
  currency = 'MXN'
): Promise<unknown> => {
  console.warn('🎯 [GET TOUR BY ID] Starting getTourById with params:', {
    id,
    language,
    currency,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET TOUR BY ID] BACKEND_URL is not configured, returning empty');
    return { success: false, data: null };
  }

  try {
    const tourEndpoint = `tours/${id}`;
    const fullUrl = `${BASE_URL}/${tourEndpoint}`;
    console.warn('🌐 [GET TOUR BY ID] Full URL to call:', fullUrl);

    const tourService = createServiceREST(BASE_URL, tourEndpoint, 'Bearer');
    console.warn('📡 [GET TOUR BY ID] Calling backend with headers:', {
      'X-Language': language,
      'X-Currency': currency,
    });

    const result = await tourService.get({
      headers: {
        'X-Language': language,
        'X-Currency': currency,
      },
    });

    console.warn('✅ [GET TOUR BY ID] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    console.error('❌ [GET TOUR BY ID] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET TOUR BY ID] Error message:', error.message);
      console.error('❌ [GET TOUR BY ID] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET TOUR BY ID] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET TOUR BY ID] Unknown error:', error);
    }
    return { error, success: false, data: null };
  }
};

/**
 * Get tours from backend API with filters
 */
/**
 * Get tours for dropdown (optimized endpoint)
 * Public endpoint - does not require authentication
 */
export const getToursDropdown = async (
  countryId: string | null = null,
  language = 'es'
): Promise<unknown> => {
  console.warn('🎯 [GET TOURS DROPDOWN] Starting with params:', {
    countryId,
    language,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET TOURS DROPDOWN] BACKEND_URL is not configured, returning empty');
    return { success: false, data: [] };
  }

  try {
    const toursEndpoint = 'tours/dropdown';
    const fullUrl = `${BASE_URL}/${toursEndpoint}`;
    console.warn('🌐 [GET TOURS DROPDOWN] Full URL to call:', fullUrl);

    // Build query params
    const params: Record<string, string> = {};
    if (countryId !== null && countryId !== '') {
      params.countryId = countryId;
    }

    // No token needed - public endpoint
    const toursService = createServiceREST(BASE_URL, toursEndpoint, '');
    console.warn('📡 [GET TOURS DROPDOWN] Calling backend with headers:', {
      'X-Language': language,
      params,
    });

    const result = await toursService.get({
      params,
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [GET TOURS DROPDOWN] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    console.error('❌ [GET TOURS DROPDOWN] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET TOURS DROPDOWN] Error message:', error.message);
      console.error('❌ [GET TOURS DROPDOWN] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET TOURS DROPDOWN] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET TOURS DROPDOWN] Unknown error:', error);
    }
    return { error, success: false, data: [] };
  }
};

/**
 * Get tours from backend API with filters
 */
/**
 * Create tour in backend API
 */
export const createTour = async (
  payload: Record<string, unknown>,
  token: string
): Promise<unknown> => {
  console.warn('🎯 [CREATE TOUR] Starting createTour with params:', {
    payload,
    hasToken: !!token,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [CREATE TOUR] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const toursEndpoint = 'tours';
    const toursService = createServiceREST(BASE_URL, toursEndpoint, `Bearer ${token}`);

    const result = await toursService.create(payload);

    console.warn('✅ [CREATE TOUR] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [CREATE TOUR] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [CREATE TOUR] Error message:', error.message);
      console.error('❌ [CREATE TOUR] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [CREATE TOUR] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [CREATE TOUR] Unknown error:', error);
    }
    return { error, success: false };
  }
};

export const getTours = async (payload: ServicePayload): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for tours');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }

  try {
    const {
      cityId,
      page = 1,
      category,
      difficulty,
      minPrice,
      maxPrice,
      userId,
      language = 'es',
      currency = 'MXN',
    } = payload;

    // cityId is required UNLESS userId is provided (to filter by provider)
    if (
      (cityId === null || cityId === undefined || cityId === '') &&
      (userId === null || userId === undefined || userId === '')
    ) {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        error: 'Either cityId or userId is required',
      };
    }

    // Build query params matching backend API
    const params: Record<string, string | number> = {
      page,
      limit: 10,
    };

    // Only add cityId if it's provided
    if (cityId !== null && cityId !== undefined && cityId !== '') {
      params.cityId = cityId;
    }

    if (userId !== null && userId !== undefined && userId !== '') {
      params.userId = userId;
    }
    if (category !== null && category !== undefined && category !== '') {
      params.category = category;
    }
    if (difficulty !== null && difficulty !== undefined && difficulty !== '') {
      params.difficulty = difficulty;
    }
    if (minPrice !== null && minPrice !== undefined && minPrice !== 0) {
      params.minPrice = minPrice;
    }
    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== 0) {
      params.maxPrice = maxPrice;
    }

    const toursEndpoint = 'tours/cards';
    const toursService = createServiceREST(BASE_URL, toursEndpoint, 'Bearer');

    const result = await toursService.get({
      params,
      headers: {
        'X-Language': language,
        'X-Currency': currency,
      },
    });

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getTours service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getTours service:', error);
    }
    return {
      error,
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }
};
