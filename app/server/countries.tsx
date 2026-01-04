import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Get all countries from backend API
 */
export const getCountries = async (language: string = 'es') => {
  try {
    const countriesEndpoint = 'cities/countries';
    const countriesService = createServiceREST(BASE_URL, countriesEndpoint, 'Bearer');
    
    const result = await countriesService.get({
      headers: {
        'X-Language': language
      }
    });

    return result;
  } catch (error) {
    console.error('Error in getCountries service:', error);
    return { error };
  }
};

/**
 * Get country by id from backend API
 */
export const getCountryById = async (id: string, language: string = 'es') => {
  try {
    const countryEndpoint = `cities/countries/${id}`;
    const countryService = createServiceREST(BASE_URL, countryEndpoint, 'Bearer');
    
    const result = await countryService.get({
      headers: {
        'X-Language': language
      }
    });

    return result;
  } catch (error) {
    console.error('Error in getCountryById service:', error);
    return { error };
  }
};
