import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL ?? '';

/**
 * Get all cities from backend API
 */
export const getCities = async (language = 'es'): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for cities');
    return { success: false, data: [] };
  }

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
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCities service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCities service:', error);
    }
    return { error, success: false, data: [] };
  }
};

/**
 * Get cities from backend API by countryId (legacy - filter on client side instead)
 */
export const getCitiesByCountryId = async (
  countryId: string,
  language = 'es'
): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for cities by country');
    return { success: false, data: [] };
  }

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
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCitiesByCountryId service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCitiesByCountryId service:', error);
    }
    return { error, success: false, data: [] };
  }
};
