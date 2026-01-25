import axios from 'axios';
import { createServiceREST } from './_index';

// Type declaration for Vite environment variables
interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export interface NewsImage {
  id: string;
  url: string;
  imageUrl?: string; // Backend can send imageUrl
  isCover: boolean;
  sortOrder: number;
}

export interface News {
  id: string;
  title_es: string;
  title_en: string;
  content_es: string;
  content_en: string;
  excerpt_es?: string;
  excerpt_en?: string;
  author: string;
  isActive: boolean;
  isPublished: boolean;
  newsImages: NewsImage[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface NewsResponse {
  success: boolean;
  data: News[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetNewsParams {
  page?: number;
  limit?: number;
  isActive?: boolean | string;
  isPublished?: boolean | string;
  language?: string;
}

/**
 * Get news from backend API with pagination and filters
 */
export const getNews = async (params: GetNewsParams = {}): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for news');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  try {
    const { page = 1, limit = 10, isActive, isPublished, language = 'es' } = params;

    const queryParams: Record<string, string | number> = {
      page,
      limit,
    };

    if (isActive !== undefined && isActive !== '') {
      queryParams.isActive = isActive.toString();
    }

    if (isPublished !== undefined && isPublished !== '') {
      queryParams.isPublished = isPublished.toString();
    }

    const newsEndpoint = 'news';
    const newsService = createServiceREST(BASE_URL, newsEndpoint, 'Bearer');

    const result = await newsService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getNews service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getNews service:', error);
    }
    return {
      error,
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
};

/**
 * Get news by ID from backend API
 */
export const getNewsById = async (id: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for news');
    return { success: false, data: null };
  }

  try {
    const newsEndpoint = `news/${id}`;
    const newsService = createServiceREST(BASE_URL, newsEndpoint, 'Bearer');

    const result = await newsService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getNewsById service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getNewsById service:', error);
    }
    return { error, success: false, data: null };
  }
};

/**
 * DTO for creating a new news article
 */
export interface CreateNewsDto {
  title_es: string;
  title_en: string;
  content_es: string;
  content_en: string;
  excerpt_es?: string;
  excerpt_en?: string;
  author: string;
  isActive: boolean;
  isPublished: boolean;
}

/**
 * Create a new news article
 */
export const createNews = async (
  data: CreateNewsDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const newsEndpoint = 'news';
  const newsService = createServiceREST(BASE_URL, newsEndpoint, `Bearer ${token}`);

  const result = await newsService.create(data, {
    headers: {
      'X-Language': language,
    },
  });
  return result;
};

/**
 * Upload images to a news article
 */
export const uploadNewsImages = async (
  newsId: string,
  imageFiles: File[],
  setCover = false,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const formData = new FormData();
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });
  formData.append('setCover', setCover.toString());

  try {
    const response = await axios.post(`${BASE_URL}/api/news/${newsId}/images`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        'X-Language': language,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};

/**
 * Update news article data
 */
export const updateNews = async (
  newsId: string,
  data: Partial<CreateNewsDto>,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.patch(`${BASE_URL}/api/news/${newsId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Language': language,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};

/**
 * Publish a news article
 */
export const publishNews = async (
  newsId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.patch(
      `${BASE_URL}/api/news/${newsId}/publish`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Language': language,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};

/**
 * Delete an image from news
 */
export const deleteNewsImage = async (
  newsId: string,
  imageId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.delete(`${BASE_URL}/api/news/${newsId}/images/${imageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Language': language,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};

/**
 * Set image as cover
 */
export const setImageAsCover = async (
  newsId: string,
  imageId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.patch(
      `${BASE_URL}/api/news/${newsId}/images/${imageId}/set-cover`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Language': language,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};

/**
 * Reorder news images
 */
export const reorderNewsImages = async (
  newsId: string,
  imageIds: string[],
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.patch(
      `${BASE_URL}/api/news/${newsId}/images/reorder`,
      { imageIds },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Language': language,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};

/**
 * Toggle news active status
 */
export const toggleNewsStatus = async (
  newsId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  try {
    const response = await axios.patch(
      `${BASE_URL}/api/news/${newsId}/toggle-status`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Language': language,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data as unknown };
    }
    return { error };
  }
};
