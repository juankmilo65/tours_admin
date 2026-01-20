import { getCities, getCitiesByCountryId } from '../cities';
import { getCountries } from '../countries';
import type { ServiceResult } from '../_index';

interface CitiesPayload {
  token?: string;
  action: string;
  filters?: {
    countryId?: string;
    isActive?: boolean | string;
  };
  pagination?: {
    page?: number;
    limit?: number;
  };
  language?: string;
}

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData, token = ''): CitiesPayload => {
  const action = formData.get('action');
  const filters = formData.get('filters');
  const pagination = formData.get('pagination');
  const language = formData.get('language');

  return {
    token,
    action: action !== null ? action.toString() : '',
    language: language !== null ? language.toString() : 'es',
    filters:
      filters !== null
        ? (JSON.parse(filters.toString()) as { countryId?: string; isActive?: boolean | string })
        : undefined,
    pagination:
      pagination !== null
        ? (JSON.parse(pagination.toString()) as { page?: number; limit?: number })
        : undefined,
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
 * Business logic for getting all cities with pagination and filters
 */
const getCitiesBusiness = async (data: CitiesPayload): Promise<ServiceResult<unknown>> => {
  try {
    const { language, filters, pagination } = data;
    const result = await getCities({
      language,
      countryId: filters?.countryId,
      isActive: filters?.isActive,
      page: pagination?.page,
      limit: pagination?.limit,
    });
    return result;
  } catch (error) {
    console.error('Error in getCitiesBusiness:', error);
    return { error };
  }
};

/**
 * Business logic for getting cities by countryId (legacy)
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
  payload: CitiesPayload
): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    getCountriesBusiness: () => getCountriesBusiness(payload),
    getCitiesBusiness: () => getCitiesBusiness(payload),
    getCitiesByCountryIdBusiness: () => getCitiesByCountryIdBusiness(payload),
  };

  const handler = ACTIONS[action];
  if (!handler) {
    return Promise.resolve({
      error: {
        status: 400,
        message: 'Invalid action',
      },
    });
  }

  return handler();
};

/**
 * Main export function
 */
const cities = (formData: FormData, token = ''): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData, token);
    const { action } = payload;
    return citiesBusinessLogic(action, payload);
  } catch (error) {
    console.error('Error in cities business logic:', error);
    return Promise.resolve({ error });
  }
};

export default cities;
