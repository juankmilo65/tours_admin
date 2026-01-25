/**
 * Offers Service - API Integration for Offers Management
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
 * Offer Types
 */
export interface Offer {
  id: string;
  tourId: string;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  discountPercentage: number;
  validFrom: string;
  validTo: string;
  maxUses: number;
  currentUses: number;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tour?: {
    id: string;
    title_es: string;
    title_en: string;
  };
}

export interface CreateOfferDto {
  tourId: string;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  discountPercentage: number;
  validFrom: string;
  validTo: string;
  maxUses: number;
  isActive: boolean;
}

export interface UpdateOfferDto {
  tourId?: string;
  title_es?: string;
  title_en?: string;
  description_es?: string;
  description_en?: string;
  discountPercentage?: number;
  validFrom?: string;
  validTo?: string;
  maxUses?: number;
  isActive?: boolean;
}

export interface OffersResponse {
  success: boolean;
  data: Offer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  error?: { message?: string };
}

export interface OfferResponse {
  success: boolean;
  data?: Offer;
  message?: string;
  error?: { message?: string };
}

/**
 * Get all offers with filters and pagination
 */
export const getOffers = async (params: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  language?: string;
}): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for offers');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }

  try {
    const { page = 1, limit = 10, isActive, language = 'es' } = params;

    // Build query params
    const queryParams: Record<string, string | number> = { page, limit };
    if (isActive !== undefined) {
      queryParams.isActive = isActive.toString();
    }

    const offersEndpoint = 'offers';
    const offersService = createServiceREST(BASE_URL, offersEndpoint, 'Bearer');

    const result = await offersService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getOffers service:', error);
    return {
      error,
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }
};

/**
 * Get offer by ID
 */
export const getOfferById = async (id: string, language = 'es'): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, data: null };
  }

  try {
    const offerEndpoint = `offers/${id}`;
    const offerService = createServiceREST(BASE_URL, offerEndpoint, 'Bearer');

    const result = await offerService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getOfferById service:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Create new offer
 */
export const createOffer = async (
  offerData: CreateOfferDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const offersEndpoint = 'offers';
  const offersService = createServiceREST(BASE_URL, offersEndpoint, `Bearer ${token}`);

  const result = await offersService.create(offerData, {
    headers: {
      'X-Language': language,
    },
  });
  return result;
};

/**
 * Update existing offer
 */
export const updateOffer = async (
  id: string,
  offerData: Partial<CreateOfferDto>,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const offersEndpoint = `offers/${id}`;
  const offersService = createServiceREST(BASE_URL, 'offers', `Bearer ${token}`);

  const result = await offersService.update(offerData, {
    headers: {
      'X-Language': language,
    },
    url: `/${offersEndpoint}`,
  });
  return result;
};

/**
 * Delete offer
 */
export const deleteOffer = async (id: string, token: string): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const offersEndpoint = `offers/${id}`;
  const offersService = createServiceREST(BASE_URL, offersEndpoint, `Bearer ${token}`);

  const result = await offersService.delete();
  return result;
};

/**
 * Upload offer image
 */
export const uploadOfferImage = async (
  offerId: string,
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
    const response = await axios.post(`${BASE_URL}/api/offers/${offerId}/image`, formData, {
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
 * Delete offer image
 */
export const deleteOfferImage = async (
  offerId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  // Use direct axios call for delete operation
  try {
    const response = await axios.delete(`${BASE_URL}/api/offers/${offerId}/image`, {
      headers: {
        Authorization: `Bearer ${token}`,
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
 * Toggle offer active status
 */
export const toggleOfferStatus = async (
  offerId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const offersEndpoint = `offers/${offerId}/toggle-status`;
  const offersService = createServiceREST(BASE_URL, 'offers', `Bearer ${token}`);

  const result = await offersService.update(
    {},
    {
      headers: {
        'X-Language': language,
      },
      url: `/${offersEndpoint}`,
    }
  );
  return result;
};
