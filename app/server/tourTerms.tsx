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

// Types for Tour Terms
export interface TourTerm {
  id: string;
  tourId: string;
  tour?: {
    id: string;
    slug: string;
    title_es: string;
    title_en: string;
  };
  terms_conditions_es: string;
  terms_conditions_en: string;
  termsConditionsId?: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TourTermsResponse {
  success?: boolean;
  data?: TourTerm[];
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: { message?: string; status?: number };
}

export interface TourTermResponse {
  success?: boolean;
  data?: TourTerm;
  message?: string;
  error?: { message?: string; status?: number };
}

export interface CreateTourTermDto {
  tourId: string;
  terms_conditions_es: string;
  terms_conditions_en: string;
  version?: string;
}

export interface UpdateTourTermDto {
  terms_conditions_es?: string;
  terms_conditions_en?: string;
}

/**
 * Get all tour terms (Admin only)
 */
export const getAllTourTerms = async (
  params: { page?: number; limit?: number; language?: string } = {},
  token?: string
): Promise<TourTermsResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, data: undefined };
  }

  try {
    const tourTermsService = createServiceREST(
      BASE_URL,
      'terms-conditions',
      token !== undefined && token !== '' ? `Bearer ${token}` : ''
    );

    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const result = await tourTermsService.get({
      headers: {
        'X-Language': params.language ?? 'es',
      },
    });

    return result as TourTermsResponse;
  } catch (error) {
    console.error('Error in getAllTourTerms:', error);
    return {
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
      success: false,
      data: undefined,
    };
  }
};

/**
 * Get tour terms for current user's tours (Owner)
 */
export const getMyTourTerms = async (
  params: {
    page?: number;
    limit?: number;
    tourId?: string;
    version?: string;
    language?: string;
  } = {},
  token: string
): Promise<TourTermsResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined || token === '') {
    return { success: false, data: undefined };
  }

  try {
    const tourTermsService = createServiceREST(
      BASE_URL,
      'terms-conditions/user/my-tours',
      `Bearer ${token}`
    );

    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.tourId !== undefined && params.tourId !== '')
      queryParams.append('tourId', params.tourId);
    if (params.version !== undefined && params.version !== '')
      queryParams.append('version', params.version);

    const result = await tourTermsService.get({
      headers: {
        'X-Language': params.language ?? 'es',
      },
    });

    return result as TourTermsResponse;
  } catch (error) {
    console.error('Error in getMyTourTerms:', error);
    return {
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
      success: false,
      data: undefined,
    };
  }
};

/**
 * Get terms for a specific tour
 */
export const getTourTermsByTourId = async (
  tourId: string,
  language?: string
): Promise<TourTermResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined || tourId === '') {
    return { success: false, data: undefined };
  }

  try {
    const tourTermsService = createServiceREST(BASE_URL, `terms-conditions/tour/${tourId}`, '');

    const result = await tourTermsService.get({
      headers: {
        'X-Language': language ?? 'es',
      },
    });

    return result as TourTermResponse;
  } catch (error) {
    console.error('Error in getTourTermsByTourId:', error);
    return {
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
      success: false,
      data: undefined,
    };
  }
};

/**
 * Create tour terms
 */
export const createTourTerms = async (
  data: CreateTourTermDto,
  token: string,
  language?: string
): Promise<TourTermResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined || token === '') {
    return { success: false, data: undefined };
  }

  try {
    const tourTermsService = createServiceREST(BASE_URL, 'terms-conditions', `Bearer ${token}`);

    const result = await tourTermsService.create(data, {
      headers: {
        'X-Language': language ?? 'es',
      },
    });

    return result as TourTermResponse;
  } catch (error) {
    console.error('Error in createTourTerms:', error);
    return {
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
      success: false,
      data: undefined,
    };
  }
};

/**
 * Update tour terms
 */
export const updateTourTerms = async (
  tourId: string,
  data: UpdateTourTermDto,
  token: string,
  language?: string
): Promise<TourTermResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined || token === '' || tourId === '') {
    return { success: false, data: undefined };
  }

  try {
    const tourTermsService = createServiceREST(
      BASE_URL,
      `terms-conditions/tour/${tourId}`,
      `Bearer ${token}`
    );

    const result = await tourTermsService.update(data, {
      headers: {
        'X-Language': language ?? 'es',
      },
    });

    return result as TourTermResponse;
  } catch (error) {
    console.error('Error in updateTourTerms:', error);
    return {
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
      success: false,
      data: undefined,
    };
  }
};

/**
 * Get dropdown terms (general terms for select)
 */
export const getTermsDropdown = async (
  params: { type?: string; language?: string } = {}
): Promise<{
  success?: boolean;
  data?: Array<{
    value: string;
    label_es: string;
    label_en: string;
    type: string;
    version: string;
    terms_es: string;
    terms_en: string;
  }>;
  count?: number;
  error?: unknown;
}> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, data: undefined };
  }

  try {
    const termsEndpoint = 'terms-conditions/dropdown';
    const termsService = createServiceREST(BASE_URL, termsEndpoint, '');

    const queryParams = new URLSearchParams();
    if (params.type !== undefined && params.type !== '') {
      queryParams.append('type', params.type);
    }

    const result = await termsService.get({
      headers: {
        'X-Language': params.language ?? 'es',
      },
    });

    return result as {
      success?: boolean;
      data?: Array<{
        value: string;
        label_es: string;
        label_en: string;
        type: string;
        version: string;
        terms_es: string;
        terms_en: string;
      }>;
      count?: number;
      error?: unknown;
    };
  } catch (error) {
    console.error('Error in getTermsDropdown:', error);
    return { error, success: false, data: undefined };
  }
};
