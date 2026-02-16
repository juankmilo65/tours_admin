import { createServiceREST } from './_index';
import type { ServicePayload } from '../types/PayloadTourDataProps';
import axios from 'axios';
import type { AxiosProgressEvent } from 'axios';

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
  currency = 'MXN',
  token = ''
): Promise<unknown> => {
  console.warn('🎯 [GET TOUR BY ID] Starting getTourById with params:', {
    id,
    language,
    currency,
    hasToken: token !== '',
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

    const tourService = createServiceREST(BASE_URL, tourEndpoint, `Bearer ${token}`);
    console.warn('📡 [GET TOUR BY ID] Calling backend with headers:', {
      'X-Language': language,
      'X-Currency': currency,
      Authorization: `Bearer ${token.substring(0, 20)}...`,
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

/**
 * Update tour in backend API
 */
export const updateTour = async (
  tourId: string,
  payload: Record<string, unknown>,
  token: string
): Promise<unknown> => {
  console.warn('🎯 [UPDATE TOUR] Starting updateTour with params:', {
    tourId,
    payload,
    hasToken: !!token,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [UPDATE TOUR] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const toursEndpoint = `tours/${tourId}`;
    const toursService = createServiceREST(BASE_URL, toursEndpoint, `Bearer ${token}`);

    const result = await toursService.update(payload);

    console.warn('✅ [UPDATE TOUR] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [UPDATE TOUR] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [UPDATE TOUR] Error message:', error.message);
      console.error('❌ [UPDATE TOUR] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [UPDATE TOUR] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [UPDATE TOUR] Unknown error:', error);
    }
    return { error, success: false };
  }
};

/**
 * Clone tour in backend API
 */
export const cloneTour = async (
  tourId: string,
  payload: {
    targetUserId: string;
    customTitleEs?: string;
    customTitleEn?: string;
    cloneImages?: boolean;
  },
  token: string
): Promise<{ success: boolean; data?: unknown; message?: string; error?: unknown }> => {
  console.warn('🎯 [CLONE TOUR] Starting cloneTour with params:', {
    tourId,
    payload,
    hasToken: !!token,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [CLONE TOUR] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const fullUrl = `${BASE_URL}/api/tours/${tourId}/clone`;
    console.warn('🌐 [CLONE TOUR] Full URL to call:', fullUrl);

    // Use POST method directly via axios
    const response = await axios.post<{ success: boolean; data?: unknown; message?: string }>(
      fullUrl,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000, // 30s timeout for clone (images may take time)
      }
    );

    const result = response.data;

    console.warn('✅ [CLONE TOUR] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [CLONE TOUR] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [CLONE TOUR] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [CLONE TOUR] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    }
    return { error, success: false };
  }
};

/**
 * Permanently delete a tour (physical deletion)
 */
export const deleteTourPhysical = async (
  tourId: string,
  token: string
): Promise<{ success: boolean; message?: string; error?: unknown }> => {
  console.warn('🎯 [DELETE TOUR] Starting deleteTourPhysical with params:', {
    tourId,
    hasToken: !!token,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [DELETE TOUR] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const fullUrl = `${BASE_URL}/api/tours/${tourId}/physical`;
    console.warn('🌐 [DELETE TOUR] Full URL to call:', fullUrl);

    // Use DELETE method directly via axios
    const response = await axios.delete<{ success: boolean; message?: string }>(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000, // 15s timeout
    });

    const result = response.data;

    console.warn('✅ [DELETE TOUR] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [DELETE TOUR] Error caught:', error);
    if (axios.isAxiosError(error) && error.response !== undefined) {
      const errorData = error.response.data as { error?: string; message?: string };
      return {
        success: false,
        error: errorData.error ?? errorData.message ?? 'Failed to delete tour',
      };
    }
    if (error instanceof Error) {
      console.error('❌ [DELETE TOUR] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [DELETE TOUR] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    }
    return { error, success: false };
  }
};

/**
 * Upload multiple images for a tour using multipart/form-data
 */

export const uploadTourImages = async (
  tourId: string,
  images: File[],
  setCover = false,
  token: string,

  // eslint-disable-next-line no-unused-vars
  onProgress?: (progress: number) => void
): Promise<unknown> => {
  console.warn('🎯 [UPLOAD TOUR IMAGES] Starting with params:', {
    tourId,
    imageCount: images.length,
    setCover,
    hasToken: !!token,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [UPLOAD TOUR IMAGES] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const toursEndpoint = `tours/${tourId}/images`;
    const fullUrl = `${BASE_URL}/api/${toursEndpoint}`;
    console.warn('🌐 [UPLOAD TOUR IMAGES] Full URL to call:', fullUrl);

    // Create FormData for multipart upload
    const formData = new FormData();

    // Append all images to the 'images' field
    images.forEach((file) => {
      formData.append('images', file);
    });

    // Add setCover parameter
    formData.append('setCover', setCover ? 'true' : 'false');

    // Use axios directly for upload progress support
    const axiosInstance = axios.create({
      baseURL: `${BASE_URL}/api/`,
      timeout: 60000, // 60 second timeout for uploads
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await axiosInstance.post(toursEndpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total !== undefined && progressEvent.total > 0 && onProgress) {
          const uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(uploadProgress);
        }
      },
    });

    console.warn('✅ [UPLOAD TOUR IMAGES] Success! Result:', JSON.stringify(result.data, null, 2));
    return result.data;
  } catch (error) {
    console.error('❌ [UPLOAD TOUR IMAGES] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [UPLOAD TOUR IMAGES] Error message:', error.message);
      console.error('❌ [UPLOAD TOUR IMAGES] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [UPLOAD TOUR IMAGES] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [UPLOAD TOUR IMAGES] Unknown error:', error);
    }
    return { error, success: false };
  }
};

/**
 * Set image as cover for a tour
 */
export const setImageAsCover = async (
  tourId: string,
  imageId: string,
  token: string
): Promise<unknown> => {
  console.warn('🎯 [SET IMAGE AS COVER] Starting with params:', {
    tourId,
    imageId,
    hasToken: !!token,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const toursEndpoint = `tours/${tourId}/images/${imageId}/set-cover`;
    const toursService = createServiceREST(BASE_URL, toursEndpoint, `Bearer ${token}`);

    const result = await toursService.update({});

    console.warn('✅ [SET IMAGE AS COVER] Success!');
    return result;
  } catch (error) {
    console.error('❌ [SET IMAGE AS COVER] Error caught:', error);
    return { error, success: false };
  }
};

/**
 * Delete image from a tour
 */
export const deleteTourImage = async (
  tourId: string,
  imageId: string,
  token: string
): Promise<unknown> => {
  console.warn('🎯 [DELETE TOUR IMAGE] Starting with params:', {
    tourId,
    imageId,
    hasToken: !!token,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const toursEndpoint = `tours/${tourId}/images/${imageId}`;
    const toursService = createServiceREST(BASE_URL, toursEndpoint, `Bearer ${token}`);

    const result = await toursService.delete();

    console.warn('✅ [DELETE TOUR IMAGE] Success!');
    return result;
  } catch (error) {
    console.error('❌ [DELETE TOUR IMAGE] Error caught:', error);
    return { error, success: false };
  }
};

export const getTours = async (payload: ServicePayload): Promise<unknown> => {
  console.warn('🎯 [GET TOURS] Starting getTours with payload:', {
    payload,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET TOURS] BACKEND_URL is not configured, returning empty for tours');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }

  try {
    const {
      cityId,
      userId,
      countryId,
      page = 1,
      category,
      difficulty,
      minPrice,
      maxPrice,
      isActive,
      language = 'es',
      currency = 'MXN',
      token,
    } = payload;

    // userId AND countryId are mandatory (for provider filtering)
    if (userId === null || userId === undefined || userId === '') {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        error: 'userId is required',
      };
    }

    if (countryId === null || countryId === undefined || countryId === '') {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        error: 'countryId is required',
      };
    }

    // Build query params matching backend API
    const params: Record<string, string | number> = {
      page,
      limit: 10,
    };

    // Mandatory parameters
    params.userId = userId;
    params.countryId = countryId;

    // Optional parameters
    if (cityId !== null && cityId !== undefined && cityId !== '') {
      params.cityId = cityId;
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

    // Optional isActive filter - only add if explicitly set (not undefined)
    if (isActive !== null && isActive !== undefined) {
      params.isActive = isActive.toString();
    }

    const toursEndpoint = 'tours/cards';
    const toursService = createServiceREST(BASE_URL, toursEndpoint, `Bearer ${token ?? ''}`);

    console.warn('🌐 [GET TOURS] Calling backend API:', {
      endpoint: toursEndpoint,
      params,
      headers: {
        'X-Language': language,
        'X-Currency': currency,
        Authorization: `Bearer ${token ?? ''}`,
      },
    });

    const result = await toursService.get({
      params,
      headers: {
        'X-Language': language,
        'X-Currency': currency,
      },
    });

    console.warn('✅ [GET TOURS] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('❌ [GET TOURS] Error caught:', error.message);
      console.error('❌ [GET TOURS] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET TOURS] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET TOURS] Unknown error:', error);
    }
    return {
      error,
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }
};
