import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL ?? '';

/**
 * Get all countries from backend API
 */
export const getCountries = async (language = 'es'): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for countries');
    return { success: false, data: [] };
  }

  try {
    const countriesEndpoint = 'countries';
    const countriesService = createServiceREST(BASE_URL, countriesEndpoint, 'Bearer');

    const result = await countriesService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCountries service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCountries service:', error);
    }
    return { error, success: false, data: [] };
  }
};

/**
 * Get country by id from backend API
 */
export const getCountryById = async (id: string, language = 'es'): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for country');
    return { success: false, data: null };
  }

  try {
    const countryEndpoint = `countries/${id}`;
    const countryService = createServiceREST(BASE_URL, countryEndpoint, 'Bearer');

    const result = await countryService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCountryById service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCountryById service:', error);
    }
    return { error, success: false, data: null };
  }
};
