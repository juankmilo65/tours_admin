import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL ?? '';

/**
 * Get all cities from backend API
 */
export const getCities = async (language = 'es'): Promise<unknown> => {
  try {
    const citiesEndpoint = 'cities';
    const citiesService = createServiceREST(BASE_URL, citiesEndpoint, 'Bearer');

    const result = await citiesService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getCities service:', error);
    return { error };
  }
};

/**
 * Get cities from backend API by countryId (legacy - filter on client side instead)
 */
export const getCitiesByCountryId = async (
  countryId: string,
  language = 'es'
): Promise<unknown> => {
  try {
    const citiesEndpoint = `cities?countryId=${countryId}`;
    const citiesService = createServiceREST(BASE_URL, citiesEndpoint, 'Bearer');

    const result = await citiesService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getCitiesByCountryId service:', error);
    return { error };
  }
};
