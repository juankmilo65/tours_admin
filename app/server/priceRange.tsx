/**
 * Price Range Service - API calls for tour price range
 */

import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL ?? '';

export interface PriceRangeResponse {
  minPrice: number;
  maxPrice: number;
  currency: string;
  count: number;
}

export interface PriceRangeFilters {
  country?: string | null;
  city?: string | null;
  category?: string | null;
}

/**
 * Get price range for tours based on filters
 */
export async function getPriceRange(
  filters?: PriceRangeFilters,
  language?: string,
  currency?: string
): Promise<PriceRangeResponse | null> {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning null for price range');
    return null;
  }

  const safeLanguage = language ?? 'es';
  const safeCurrency = currency ?? 'MXN';
  const safeFilters = filters ?? {};

  try {
    const params: Record<string, string> = {};

    if (
      safeFilters.country !== null &&
      safeFilters.country !== undefined &&
      safeFilters.country.trim().length > 0
    ) {
      params.country = safeFilters.country;
    }
    if (
      safeFilters.city !== null &&
      safeFilters.city !== undefined &&
      safeFilters.city.trim().length > 0
    ) {
      params.city = safeFilters.city;
    }
    if (
      safeFilters.category !== null &&
      safeFilters.category !== undefined &&
      safeFilters.category.trim().length > 0
    ) {
      params.category = safeFilters.category;
    }

    const priceRangeEndpoint = 'tours/price-range';
    const priceRangeService = createServiceREST(BASE_URL, priceRangeEndpoint, 'Bearer');

    const result = await priceRangeService.get({
      params,
      headers: {
        'X-Language': safeLanguage,
        'X-Currency': safeCurrency,
      },
    });

    // Check for error in result using type guard
    if (result !== null && typeof result === 'object' && 'error' in result) {
      console.error('Price range fetch failed:', result.error);
      return null;
    }

    // Handle response structure - result is now known to be success type
    const typedResult = result as { success?: boolean; data?: PriceRangeResponse };

    if (typedResult.success === true && typedResult.data !== undefined) {
      return typedResult.data;
    }

    return null;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error fetching price range:', error.message);
      // If it's a connection error, log a helpful message
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error fetching price range:', error);
    }
    return null;
  }
}
