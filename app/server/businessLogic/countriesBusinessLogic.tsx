import { getCountries, getCountryById } from '../countries';
import { ServiceResult } from '../_index';

interface CountriesPayload {
  token?: string;
  action: string;
  id?: string;
  language?: string;
}

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData, token: string = ''): CountriesPayload => {
  const action = formData.get('action');
  const id = formData.get('id');
  const language = formData.get('language');

  return {
    token,
    action: action ? action.toString() : '',
    id: id ? id.toString() : undefined,
    language: language ? language.toString() : 'es',
  };
};

/**
 * Business logic for getting all countries
 */
const getCountriesBusiness = async (data: CountriesPayload): Promise<ServiceResult<unknown>> => {
  try {
    const result = await getCountries(data.language || 'es');
    return result;
  } catch (error) {
    console.error('Error in getCountriesBusiness:', error);
    return { error };
  }
};

/**
 * Business logic for getting a country by id
 */
const getCountryByIdBusiness = async (data: CountriesPayload): Promise<ServiceResult<unknown>> => {
  try {
    const { id } = data;
    if (!id) {
      return { error: 'Country ID is required' };
    }
    const result = await getCountryById(id, data.language || 'es');
    return result;
  } catch (error) {
    console.error('Error in getCountryByIdBusiness:', error);
    return { error };
  }
};

/**
 * Main business logic router
 */
const countriesBusinessLogic = async (
  action: string,
  data: CountriesPayload
): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    getCountriesBusiness: async () => await getCountriesBusiness(data),
    getCountryByIdBusiness: async () => await getCountryByIdBusiness(data),
  };

  const handler = ACTIONS[action];
  if (!handler) {
    return { 
      error: {
        status: 400,
        message: 'Invalid action'
      }
    };
  }
  
  return handler();
};

/**
 * Main export function
 */
const countries = async (formData: FormData, token: string = ''): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData, token);
    const { action } = payload;
    return await countriesBusinessLogic(action, payload);
  } catch (error) {
    console.error('Error in countries business logic:', error);
    return { error };
  }
};

export default countries;
