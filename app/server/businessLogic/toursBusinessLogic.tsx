import {
  getTours,
  getTourById,
  getToursDropdown,
  createTour,
  updateTour,
  cloneTour,
  deleteTourPhysical,
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
      isActive,
    } = filters as {
      cityId?: string;
      page?: string | number;
      category?: string;
      difficulty?: string;
      minPrice?: string | number;
      maxPrice?: string | number;
      userId?: string;
      countryId?: string;
      isActive?: boolean;
    };

    const payload = {
      cityId,
      userId,
      countryId,
      page: typeof page === 'string' ? Number.parseInt(page, 10) : page,
      category,
      difficulty,
      minPrice: typeof minPrice === 'string' ? Number.parseFloat(minPrice) : minPrice,
      maxPrice: typeof maxPrice === 'string' ? Number.parseFloat(maxPrice) : maxPrice,
      isActive,
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
 * Business logic for getting a single tour by ID with full details
 * This endpoint returns complete tour data including userId, descriptions, etc.
 */
const getTourByIdBusiness = async (
  tourId: string,
  language = 'es',
  currency = 'MXN',
  token = ''
): Promise<ServiceResult<unknown>> => {
  try {
    console.warn('[getTourByIdBusiness] Fetching tour details for:', tourId);
    const result = await getTourById(tourId, language, currency, token);
    console.warn('[getTourByIdBusiness] Result:', result);
    return result;
  } catch (error) {
    console.error('Error in getTourByIdBusiness:', error);
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
 * Parse an activity time string ("HH:MM AM/PM" or "HH:MM" 24h) to minutes since midnight.
 */
const parseTimeToMinutes = (timeStr: string): number => {
  const amPm = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPm !== null) {
    let h = parseInt(amPm[1] ?? '0', 10);
    const m = parseInt(amPm[2] ?? '0', 10);
    const period = (amPm[3] ?? '').toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const h24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (h24 !== null) {
    return parseInt(h24[1] ?? '0', 10) * 60 + parseInt(h24[2] ?? '0', 10);
  }
  return -1;
};

/**
 * Business logic for getting a tour's hour range derived from its activities.
 * Computes the range client-side from the tour's activity times to avoid the
 * backend's alphabetical sort bug with 12-hour AM/PM time strings.
 * Returns { tourId, hourRange } where hourRange is "HH:MM - HH:MM" (first to last
 * activity by actual clock time) or null when there are no activities.
 */
export const getTourHourRangeBusiness = async (
  tourId: string,
  token: string,
  language = 'es'
): Promise<{
  success: boolean;
  data?: { tourId: string; hourRange: string | null };
  message?: string;
}> => {
  if (token === '' || token === undefined) {
    return { success: false, message: 'Authentication required' };
  }

  if (tourId === '' || tourId === undefined) {
    return { success: false, message: 'Tour ID is required' };
  }

  try {
    const tourResult = (await getTourById(tourId, language, 'MXN', token)) as {
      success?: boolean;
      data?: { activities?: Array<{ hora?: string }> };
      message?: string;
    };

    if (tourResult.success !== true || tourResult.data === undefined) {
      return { success: false, message: tourResult.message ?? 'Tour not found' };
    }

    const activities = tourResult.data.activities ?? [];
    const times = activities
      .map((a) => ({ raw: a.hora ?? '', mins: parseTimeToMinutes(a.hora ?? '') }))
      .filter((t) => t.raw !== '' && t.mins >= 0);

    if (times.length === 0) {
      return { success: true, data: { tourId, hourRange: null } };
    }

    times.sort((a, b) => a.mins - b.mins);
    const first = times.at(0)?.raw ?? '';
    const last = times.at(-1)?.raw ?? '';
    const hourRange = first === last ? first : `${first} - ${last}`;

    return { success: true, data: { tourId, hourRange } };
  } catch (error) {
    console.error('Error in getTourHourRangeBusiness:', error);
    return { success: false, message: 'Error fetching tour hour range' };
  }
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
 * Business logic for updating a tour
 */
const updateTourBusiness = async (
  tourId: string,
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

    if (tourId === '' || tourId === undefined) {
      return Promise.resolve({
        error: {
          status: 400,
          message: 'Tour ID is required',
        },
      });
    }

    const result = await updateTour(tourId, data, token);
    return result;
  } catch (error) {
    console.error('Error in updateTourBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for cloning a tour
 */
const cloneTourBusiness = async (
  tourId: string,
  data: {
    targetUserId: string;
    customTitleEs?: string;
    customTitleEn?: string;
    cloneImages?: boolean;
  },
  token = ''
): Promise<ServiceResult<{ success: boolean; data?: unknown; message?: string }>> => {
  try {
    if (token === '' || token === undefined) {
      return Promise.resolve({
        error: {
          status: 401,
          message: 'Access token is required',
        },
      });
    }

    if (tourId === '' || tourId === undefined) {
      return Promise.resolve({
        error: {
          status: 400,
          message: 'Tour ID is required',
        },
      });
    }

    if (data.targetUserId === '' || data.targetUserId === undefined) {
      return Promise.resolve({
        error: {
          status: 400,
          message: 'Target user ID is required',
        },
      });
    }

    const result = await cloneTour(tourId, data, token);
    return result;
  } catch (error) {
    console.error('Error in cloneTourBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for permanently deleting a tour (physical deletion)
 */
const deleteTourBusiness = async (
  tourId: string,
  token: string
): Promise<{ success: boolean; message?: string; error?: unknown }> => {
  try {
    const result = await deleteTourPhysical(tourId, token);
    return result;
  } catch (error) {
    console.error('Error in deleteTourBusiness:', error);
    return { success: false, error };
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
  getTourByIdBusiness,
  createTourBusiness,
  updateTourBusiness,
  cloneTourBusiness,
  deleteTourBusiness,
  uploadTourImages,
  setImageAsCover,
  deleteTourImage,
};
export default tours;
