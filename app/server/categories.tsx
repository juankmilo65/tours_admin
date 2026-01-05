import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL || '';

/**
 * Get all categories from backend API
 */
export const getCategories = async (language: string = 'es', isActive?: boolean) => {
  try {
    const params = isActive !== undefined ? `?isActive=${isActive}` : '';
    const categoriesEndpoint = `categories${params}`;
    const categoriesService = createServiceREST(BASE_URL, categoriesEndpoint, 'Bearer');
    
    const result = await categoriesService.get({
      headers: {
        'X-Language': language
      }
    });

    return result;
  } catch (error) {
    console.error('Error in getCategories service:', error);
    return { error };
  }
};

/**
 * Get category by ID from backend API
 */
export const getCategoryById = async (id: string, language: string = 'es') => {
  try {
    const categoryEndpoint = `categories/${id}`;
    const categoryService = createServiceREST(BASE_URL, categoryEndpoint, 'Bearer');
    
    const result = await categoryService.get({
      headers: {
        'X-Language': language
      }
    });

    return result;
  } catch (error) {
    console.error('Error in getCategoryById service:', error);
    return { error };
  }
};
