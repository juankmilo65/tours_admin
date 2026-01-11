import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL ?? '';

/**
 * Get all categories from backend API
 */
export const getCategories = async (language = 'es', isActive?: boolean): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for categories');
    return { success: false, data: [] };
  }

  try {
    const params = isActive !== undefined ? `?isActive=${isActive}` : '';
    const categoriesEndpoint = `categories${params}`;
    const categoriesService = createServiceREST(BASE_URL, categoriesEndpoint, 'Bearer');

    const result = await categoriesService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCategories service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCategories service:', error);
    }
    return { error, success: false, data: [] };
  }
};

/**
 * Get category by ID from backend API
 */
export const getCategoryById = async (id: string, language = 'es'): Promise<unknown> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for category');
    return { success: false, data: null };
  }

  try {
    const categoryEndpoint = `categories/${id}`;
    const categoryService = createServiceREST(BASE_URL, categoryEndpoint, 'Bearer');

    const result = await categoryService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getCategoryById service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getCategoryById service:', error);
    }
    return { error, success: false, data: null };
  }
};
