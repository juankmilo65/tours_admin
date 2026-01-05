import { createServiceREST } from './_index';
import { ServicePayload } from '../types/PayloadTourDataProps';

const BASE_URL = process.env.BACKEND_URL || '';

/**
 * Get tours from backend API with filters
 */
export const getTours = async (payload: ServicePayload) => {
  try {
    const { cityId, page = 1, category, difficulty, minPrice, maxPrice, language = 'es', currency = 'MXN' } = payload;
    
    if (!cityId) {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        error: 'cityId is required'
      };
    }
    
    // Build query params matching backend API
    const params: Record<string, string | number> = {
      page,
      limit: 10,
      city: cityId, // Backend expects 'city' not 'cityId'
    };
    
    if (category) params.category = category;
    if (difficulty) params.difficulty = difficulty;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    
    const toursEndpoint = 'tours/cards';
    const toursService = createServiceREST(BASE_URL, toursEndpoint, 'Bearer');
    
    const result = await toursService.get({
      params,
      headers: {
        'X-Language': language,
        'X-Currency': currency
      }
    });

    return result;
  } catch (error) {
    console.error('Error in getTours service:', error);
    return { error };
  }
};