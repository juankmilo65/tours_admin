import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL ;

/**
 * Get cities from backend API by countryId
 */
export const getCitiesByCountryId = async (countryId: string, language: string = 'es') => {
  try {
    const citiesEndpoint = `cities?countryId=${countryId}`;
    const citiesService = createServiceREST(BASE_URL, citiesEndpoint, 'Bearer');
    
    const result = await citiesService.get({
      headers: {
        'X-Language': language
      }
    });

    return result;
  } catch (error) {
    console.error('Error in getCitiesByCountryId service:', error);
    return { error };
  }
};
