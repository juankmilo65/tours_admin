import { getCategories, getCategoryById } from '../categories';
import { ServiceResult } from '../_index';

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
const generatePayload = (formData: FormData, token: string = ''): CategoriesPayload => {
  const action = formData.get('action');
  const categoryId = formData.get('categoryId');
  const language = formData.get('language');
  const isActive = formData.get('isActive');

  return {
    token,
    action: action ? action.toString() : '',
    categoryId: categoryId ? categoryId.toString() : undefined,
    language: language ? language.toString() : 'es',
    isActive: isActive ? isActive.toString() === 'true' : undefined,
  };
};

/**
 * Business logic for getting all categories
 */
const getCategoriesBusiness = async (data: CategoriesPayload): Promise<ServiceResult<unknown>> => {
  try {
    const result = await getCategories(data.language || 'es', data.isActive);
    return result;
  } catch (error) {
    console.error('Error in getCategoriesBusiness:', error);
    return { error };
  }
};

/**
 * Business logic for getting a category by ID
 */
const getCategoryByIdBusiness = async (data: CategoriesPayload): Promise<ServiceResult<unknown>> => {
  try {
    const { categoryId, language } = data;
    if (!categoryId) {
      return { error: 'Category ID is required' };
    }
    const result = await getCategoryById(categoryId, language || 'es');
    return result;
  } catch (error) {
    console.error('Error in getCategoryByIdBusiness:', error);
    return { error };
  }
};

/**
 * Main business logic router
 */
const categoriesBusinessLogic = async (
  action: string,
  data: CategoriesPayload
): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    getCategoriesBusiness: async () => await getCategoriesBusiness(data),
    getCategoryByIdBusiness: async () => await getCategoryByIdBusiness(data),
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
const categories = async (formData: FormData, token: string = ''): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData, token);
    const { action } = payload;
    return await categoriesBusinessLogic(action, payload);
  } catch (error) {
    console.error('Error in categories business logic:', error);
    return { error };
  }
};

export default categories;
