import { createServiceREST } from './_index';

// Type declaration for Vite environment variables
interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

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

/**
 * Get countries for dropdown
 * Public endpoint - does not require authentication
 */
export const getCountriesDropdown = async (language = 'es'): Promise<unknown> => {
  console.warn('🎯 [GET COUNTRIES DROPDOWN] Starting with params:', { language, BASE_URL });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET COUNTRIES DROPDOWN] BACKEND_URL is not configured, returning empty');
    return { success: false, data: [] };
  }

  try {
    const countriesEndpoint = 'countries/dropdown';
    const fullUrl = `${BASE_URL}/${countriesEndpoint}`;
    console.warn('🌐 [GET COUNTRIES DROPDOWN] Full URL to call:', fullUrl);

    // No token needed - public endpoint
    const countriesService = createServiceREST(BASE_URL, countriesEndpoint, '');
    console.warn('📡 [GET COUNTRIES DROPDOWN] Calling backend with headers:', {
      'X-Language': language,
    });

    const result = await countriesService.get({
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [GET COUNTRIES DROPDOWN] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    console.error('❌ [GET COUNTRIES DROPDOWN] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET COUNTRIES DROPDOWN] Error message:', error.message);
      console.error('❌ [GET COUNTRIES DROPDOWN] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET COUNTRIES DROPDOWN] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET COUNTRIES DROPDOWN] Unknown error:', error);
    }
    return { error, success: false, data: [] };
  }
};
