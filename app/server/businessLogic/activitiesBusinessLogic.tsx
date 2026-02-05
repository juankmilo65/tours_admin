/**
 * Activities Business Logic Layer
 * Handles all business operations for activities management
 */

import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  toggleActivityStatus,
  getActivitiesDropdown,
  type GetActivitiesParams,
  type CreateActivityDto,
  type UpdateActivityDto,
} from '../activities';
import type { ServiceResult } from '../_index';

/**
 * Payload interface for activities operations
 */
export interface ActivitiesPayload {
  token?: string;
  action?: string;
  language?: string;
  filters?: {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean | string;
  };
}

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData, token = ''): ActivitiesPayload => {
  const action = formData.get('action');
  const filters = formData.get('filters');
  const language = formData.get('language');

  return {
    token,
    action: action !== null && action !== undefined ? action.toString() : '',
    language: language !== null && language !== undefined ? language.toString() : 'es',
    filters:
      filters !== null && filters !== undefined
        ? (JSON.parse(filters.toString()) as ActivitiesPayload['filters'])
        : undefined,
  };
};

/**
 * Business logic for getting activities
 */
const getActivitiesBusiness = async (data: ActivitiesPayload): Promise<ServiceResult<unknown>> => {
  try {
    const { filters = {}, language = 'es' } = data;
    const { page = 1, limit = 10, category, isActive } = filters;

    const params: GetActivitiesParams = {
      page,
      limit,
      language,
    };

    if (category !== undefined && category !== '') {
      params.category = category;
    }

    if (isActive !== undefined && isActive !== '') {
      params.isActive = isActive;
    }

    const result = await getActivities(params);
    return result;
  } catch (error) {
    console.error('Error in getActivitiesBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for getting a single activity by ID
 */
const getActivityByIdBusiness = async (
  activityId: string,
  language = 'es'
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await getActivityById(activityId, language);
    return result;
  } catch (error) {
    console.error('Error in getActivityByIdBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for creating an activity
 */
const createActivityBusiness = async (
  data: CreateActivityDto,
  token: string,
  language = 'es'
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await createActivity(data, token, language);
    return result;
  } catch (error) {
    console.error('Error in createActivityBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for updating an activity
 */
const updateActivityBusiness = async (
  activityId: string,
  data: UpdateActivityDto,
  token: string,
  language = 'es'
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await updateActivity(activityId, data, token, language);
    return result;
  } catch (error) {
    console.error('Error in updateActivityBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for deleting an activity
 */
const deleteActivityBusiness = async (
  activityId: string,
  token: string,
  language = 'es'
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await deleteActivity(activityId, token, language);
    return result;
  } catch (error) {
    console.error('Error in deleteActivityBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for toggling activity status
 */
const toggleActivityStatusBusiness = async (
  activityId: string,
  token: string,
  language = 'es'
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await toggleActivityStatus(activityId, token, language);
    return result;
  } catch (error) {
    console.error('Error in toggleActivityStatusBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for getting activities dropdown
 */
const getActivitiesDropdownBusiness = async (language = 'es'): Promise<ServiceResult<unknown>> => {
  try {
    const result = await getActivitiesDropdown(language);
    return result;
  } catch (error) {
    console.error('Error in getActivitiesDropdownBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Main activities business logic handler
 */
export const activitiesBusinessLogic = (
  formData: FormData,
  token?: string
): Promise<ServiceResult<unknown>> => {
  const payload = generatePayload(formData, token);

  switch (payload.action) {
    case 'getActivities':
      return getActivitiesBusiness(payload);
    default:
      return Promise.resolve({ error: 'Invalid action' });
  }
};

// Export individual functions for direct usage
export {
  generatePayload,
  getActivitiesBusiness,
  getActivityByIdBusiness,
  createActivityBusiness,
  updateActivityBusiness,
  deleteActivityBusiness,
  toggleActivityStatusBusiness,
  getActivitiesDropdownBusiness,
};
