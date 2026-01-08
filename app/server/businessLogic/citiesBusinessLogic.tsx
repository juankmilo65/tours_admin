import { getCities, getCitiesByCountryId } from '../cities';
import { getCountries } from '../countries';
import type { ServiceResult } from '../_index';

interface CitiesPayload {
  token?: string;
  action: string;
  filters?: {
    countryId: string;
  };
  language?: string;
}

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData, token = ''): CitiesPayload => {
  const action = formData.get('action');
  const filters = formData.get('filters');
  const language = formData.get('language');

  return {
    token,
    action: action !== null ? action.toString() : '',
    language: language !== null ? language.toString() : 'es',
    filters:
      filters !== null ? (JSON.parse(filters.toString()) as { countryId: string }) : undefined,
  };
};

/**
 * Business logic for getting countries
 */
const getCountriesBusiness = async (data: CitiesPayload): Promise<ServiceResult<unknown>> => {
  try {
    const result = await getCountries(data.language ?? 'es');
    return result;
  } catch (error) {
    console.error('Error in getCountriesBusiness:', error);
    return { error };
  }
};

/**
 * Business logic for getting all cities
 */
const getCitiesBusiness = async (data: CitiesPayload): Promise<ServiceResult<unknown>> => {
  try {
    const { language } = data;
    const result = await getCities(language);
    return result;
  } catch (error) {
    console.error('Error in getCitiesBusiness:', error);
    return { error };
  }
};

/**
 * Business logic for getting cities by countryId
 */
const getCitiesByCountryIdBusiness = async (
  data: CitiesPayload
): Promise<ServiceResult<unknown>> => {
  try {
    const { filters, language } = data;
    const { countryId } = filters ?? {};
    if (countryId === undefined || countryId === '') {
      return { error: 'Country ID is required' };
    }
    const result = await getCitiesByCountryId(countryId, language);

    return result;
  } catch (error) {
    console.error('Error in getCitiesByCountryIdBusiness:', error);
    return { error };
  }
};

/**
 * Main business logic router
 */
const citiesBusinessLogic = (
  action: string,
  data: CitiesPayload
): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    getCountriesBusiness: () => getCountriesBusiness(data),
    getCitiesBusiness: () => getCitiesBusiness(data),
    getCitiesByCountryIdBusiness: () => getCitiesByCountryIdBusiness(data),
  };

  const handler = ACTIONS[action];
  if (!handler) {
    return {
      error: {
        status: 400,
        message: 'Invalid action',
      },
    };
  }

  return handler();
};

/**
 * Main export function
 */
const cities = async (formData: FormData, token = ''): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData, token);
    const { action } = payload;
    return await citiesBusinessLogic(action, payload);
  } catch (error) {
    console.error('Error in cities business logic:', error);
    return { error };
  }
};

export default cities;
