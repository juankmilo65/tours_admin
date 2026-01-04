import { getTours } from '../tours';
import { ToursPayload } from '../../types/PayloadTourDataProps';
import { ServiceResult } from '../_index';

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData, token: string = ''): ToursPayload => {
  const action = formData.get('action');
  const filters = formData.get('filters');
  const language = formData.get('language');

  return {
    token,
    action: action ? action.toString() : '',
    language: language ? language.toString() : 'es',
    filters: filters ? JSON.parse(filters.toString()) : undefined,
  };
};

/**
 * Business logic for getting tours
 */
const getToursBusiness = async (data: ToursPayload): Promise<ServiceResult<unknown>> => {
  try {
    const { filters = {}, token, language = 'es' } = data;
    const { cityId, page, category, difficulty, minPrice, maxPrice } = filters;
    
    const payload = {
      cityId,
      page,
      category,
      difficulty,
      minPrice,
      maxPrice,
      token,
      language,
      currency: 'MXN'
    };

    const result = await getTours(payload);
    
    return result;
  } catch (error) {
    console.error('Error in getToursBusiness:', error);
    return { error };
  }
};

/**
 * Main business logic router
 */
const toursBusinessLogic = async (
  action: string,
  data: ToursPayload
): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    getToursBusiness: async () => await getToursBusiness(data)
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
const tours = async (formData: FormData, token: string = ''): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData, token);
    const { action } = payload;
    return await toursBusinessLogic(action, payload);
  } catch (error) {
    console.error('Error in tours business logic:', error);
    return { error };
  }
};

export default tours;
