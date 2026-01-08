import { getCategories, getCategoryById } from '../categories';
import type { ServiceResult } from '../_index';

interface CategoriesPayload {
  token?: string;
  action: string;
  categoryId?: string;
  language?: string;
  isActive?: boolean;
}

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData, token = ''): CategoriesPayload => {
  const action = formData.get('action');
  const categoryId = formData.get('categoryId');
  const language = formData.get('language');
  const isActive = formData.get('isActive');

  return {
    token,
    action: action !== null && action !== undefined && typeof action === 'string' ? action : '',
    categoryId:
      categoryId !== null && categoryId !== undefined && typeof categoryId === 'string'
        ? categoryId
        : undefined,
    language:
      language !== null && language !== undefined && typeof language === 'string' ? language : 'es',
    isActive:
      isActive !== null && isActive !== undefined && typeof isActive === 'string'
        ? isActive === 'true'
        : undefined,
  };
};

/**
 * Business logic for getting all categories
 */
const getCategoriesBusiness = (data: CategoriesPayload): Promise<ServiceResult<unknown>> => {
  return getCategories(data.language ?? 'es', data.isActive).catch((error: unknown) => {
    console.error('Error in getCategoriesBusiness:', error);
    return { error };
  });
};

/**
 * Business logic for getting a category by ID
 */
const getCategoryByIdBusiness = (data: CategoriesPayload): Promise<ServiceResult<unknown>> => {
  const { categoryId, language } = data;
  if (categoryId === undefined || categoryId === null || categoryId === '') {
    return Promise.resolve({ error: 'Category ID is required' });
  }
  return getCategoryById(categoryId, language ?? 'es').catch((error: unknown) => {
    console.error('Error in getCategoryByIdBusiness:', error);
    return { error };
  });
};

/**
 * Main business logic router
 */
const categoriesBusinessLogic = (
  action: string,
  data: CategoriesPayload
): Promise<ServiceResult<unknown>> => {
  switch (action) {
    case 'getCategoriesBusiness':
      return getCategoriesBusiness(data);
    case 'getCategoryByIdBusiness':
      return getCategoryByIdBusiness(data);
    default:
      return Promise.resolve({
        error: {
          status: 400,
          message: 'Invalid action',
        },
      });
  }
};

/**
 * Main export function
 */
const categories = async (formData: FormData, token = ''): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData, token);
    return await categoriesBusinessLogic(payload.action, payload);
  } catch (error) {
    console.error('Error in categories business logic:', error);
    return { error };
  }
};

export default categories;
