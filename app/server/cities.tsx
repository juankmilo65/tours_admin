import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Get countries from backend API
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
 * Search cities from backend API
 */
export const searchCitiesByCountry = async (country: string) => {
  try {
    const citiesEndpoint = `cities/search?q=${country}`;
    const citiesService = createServiceREST(BASE_URL, citiesEndpoint, 'Bearer');
    
    const result = await citiesService.get({
      headers: {
        'X-Language': 'es'
      }
    });

    return result;
  } catch (error) {
    console.error('Error in searchCities service:', error);
    return { error };
  }
};
