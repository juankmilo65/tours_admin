/**
 * Price Range Service - API calls for tour price range
 */

import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL;

export interface PriceRangeResponse {
  minPrice: number;
  maxPrice: number;
  currency: string;
  count: number;
}

export interface PriceRangeFilters {
  country?: string;
  city?: string;
  category?: string;
}

/**
 * Get price range for tours based on filters
 */
export async function getPriceRange(
  filters: PriceRangeFilters = {},
  language: string = 'es',
  currency: string = 'MXN'
): Promise<PriceRangeResponse | null> {
  try {
    const params: Record<string, string> = {};
    
    if (filters.country) params.country = filters.country;
    if (filters.city) params.city = filters.city;
    if (filters.category) params.category = filters.category;

    const priceRangeEndpoint = 'tours/price-range';
    const priceRangeService = createServiceREST(BASE_URL, priceRangeEndpoint, 'Bearer');

    const result = await priceRangeService.get({
      params,
      headers: {
        'X-Language': language,
        'X-Currency': currency,
      },
    });

    // Check for error in result
    if ('error' in result) {
      console.error('Price range fetch failed:', result.error);
      return null;
    }

    // Handle response structure
    const response = result as { success?: boolean; data?: PriceRangeResponse };
    
    if (response.success && response.data) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('Error fetching price range:', error);
    return null;
  }
}
