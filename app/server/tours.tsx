import { createServiceREST } from './_index';
import { ServicePayload } from '../types/PayloadTourDataProps';

const BASE_URL = process.env.BACKEND_URL;

/**
 * Get tours from backend API by cityId
 */
export const getTours = async (payload: ServicePayload) => {
  try {
    const { data = {}, cityId, language = 'es', currency = 'MXN' } = payload;
    
    if (!cityId) {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        error: 'cityId is required'
      };
    }
    
    const toursEndpoint = `cities/${cityId}/tours`;
    const toursService = createServiceREST(BASE_URL, toursEndpoint, 'Bearer');
    
    const result = await toursService.get({
      params: data,
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