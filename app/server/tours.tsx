import { createServiceREST } from './_index';
import type { ServicePayload } from '../types/PayloadTourDataProps';

const BASE_URL = process.env.BACKEND_URL ?? '';

/**
 * Get tours from backend API with filters
 */
export const getTours = async (payload: ServicePayload): Promise<unknown> => {
  try {
    const {
      cityId,
      page = 1,
      category,
      difficulty,
      minPrice,
      maxPrice,
      language = 'es',
      currency = 'MXN',
    } = payload;

    if (cityId === null || cityId === undefined || cityId === '') {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        error: 'cityId is required',
      };
    }

    // Build query params matching backend API
    const params: Record<string, string | number> = {
      page,
      limit: 10,
      cityId: cityId, // Backend expects 'cityId'
    };

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
    console.error('Error in getTours service:', error);
    return { error };
  }
};
