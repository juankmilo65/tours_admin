import { createServiceREST } from './_index';
import { ServicePayload } from '../types/PayloadTourDataProps';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Get tours from backend API
 */
export const getTours = async (payload: ServicePayload) => {
  try {
    const { data = {} } = payload;
    const toursEndpoint = 'tours';
    const toursService = createServiceREST(BASE_URL, toursEndpoint, 'Bearer');

    console.log('🌐 Service - Calling API:', `${BASE_URL}/${toursEndpoint}`);
    console.log('🌐 Service - With params:', data);
    
    // Use GET instead of POST (create)
    const result = await toursService.get({
      params: data
    });

    console.log('🌐 Service - API Response:', result);
    
    return result;
  } catch (error) {
    console.error('Error in getTours service:', error);
    return { error };
  }
};