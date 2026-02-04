import {
  getTours,
  getToursDropdown,
  createTour,
  uploadTourImages,
  setImageAsCover,
  deleteTourImage,
} from '../tours';
import type { ToursPayload } from '../../types/PayloadTourDataProps';
import type { ServiceResult } from '../_index';

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData, token = ''): ToursPayload => {
  const action = formData.get('action');
  const filters = formData.get('filters');
  const language = formData.get('language');

  return {
    token,
    action: action !== null && action !== undefined ? action.toString() : '',
    language: language !== null && language !== undefined ? language.toString() : 'es',
    filters:
      filters !== null && filters !== undefined
        ? (JSON.parse(filters.toString()) as ToursPayload['filters'])
        : undefined,
  };
};

/**
 * Business logic for getting tours
 */
const getToursBusiness = async (data: ToursPayload): Promise<ServiceResult<unknown>> => {
  try {
    const { filters = {}, token, language = 'es' } = data;
    const {
      cityId,
      page = 1,
      category,
      difficulty,
      minPrice,
      maxPrice,
      userId,
      countryId,
    } = filters;

    const payload = {
      cityId,
      userId,
      countryId,
      page: typeof page === 'string' ? Number.parseInt(page, 10) : page,
      category,
      difficulty,
      minPrice: typeof minPrice === 'string' ? Number.parseFloat(minPrice) : minPrice,
      maxPrice: typeof maxPrice === 'string' ? Number.parseFloat(maxPrice) : maxPrice,
      token,
      language,
      currency: 'MXN',
    };

    const result = await getTours(payload);

    return result;
  } catch (error) {
    console.error('Error in getToursBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for getting tours for dropdown
 * Public endpoint - does not require authentication
 */
const getToursDropdownBusiness = async (
  countryId: string | null = null,
  language = 'es'
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await getToursDropdown(countryId, language);
    return result;
  } catch (error) {
    console.error('Error in getToursDropdownBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Main business logic router
 */
const toursBusinessLogic = (
  action: string,
  data: ToursPayload
): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    getToursBusiness: () => getToursBusiness(data),
    getToursDropdownBusiness: () => getToursDropdownBusiness(data.countryId ?? null, data.language),
  };

  const handler = ACTIONS[action];
  if (handler === undefined) {
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
 * Business logic for creating a tour
 */
const createTourBusiness = async (
  data: Record<string, unknown>,
  token = ''
): Promise<ServiceResult<unknown>> => {
  try {
    if (token === '' || token === undefined) {
      return Promise.resolve({
        error: {
          status: 401,
          message: 'Access token is required',
        },
      });
    }

    const result = await createTour(data, token);
    return result;
  } catch (error) {
    console.error('Error in createTourBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Main export function
 */
const tours = (formData: FormData, token = ''): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData, token);
    const { action } = payload;
    return toursBusinessLogic(action, payload);
  } catch (error) {
    console.error('Error in tours business logic:', error);
    return Promise.resolve({ error });
  }
};

export {
  getToursDropdownBusiness,
  createTourBusiness,
  uploadTourImages,
  setImageAsCover,
  deleteTourImage,
};
export default tours;
