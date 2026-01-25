/**
 * Price Range Service - API calls for tour price range
 */

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

// Simple cache implementation to avoid rate limiting
interface CacheEntry {
  data: PriceRangeResponse;
  timestamp: number;
}

const priceRangeCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

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
 * Generate cache key from filters
 */
function getCacheKey(filters: PriceRangeFilters, language: string, currency: string): string {
  const parts = [
    language,
    currency,
    filters.country ?? '',
    filters.city ?? '',
    filters.category ?? '',
  ];
  return parts.join('|');
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

  // Check cache first to avoid rate limiting
  const cacheKey = getCacheKey(safeFilters, safeLanguage, safeCurrency);
  const cachedEntry = priceRangeCache.get(cacheKey);
  const now = Date.now();

  if (cachedEntry !== undefined && now - cachedEntry.timestamp < CACHE_TTL) {
    console.log(
      '✅ [PRICE RANGE] Using cached data (cache age:',
      Math.floor((now - cachedEntry.timestamp) / 1000),
      'seconds)'
    );
    return cachedEntry.data;
  }

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
      // Store in cache
      priceRangeCache.set(cacheKey, {
        data: typedResult.data,
        timestamp: Date.now(),
      });
      console.log('✅ [PRICE RANGE] Data cached successfully');
      return typedResult.data;
    }

    return null;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error fetching price range:', error.message);

      // Check for 429 Too Many Requests error
      if (error.message.includes('status code 429')) {
        console.warn('Rate limit exceeded (429). Please wait before retrying.');
        return null; // Return null, UI will handle gracefully
      }

      // If it's a connection error, log a helpful message
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error fetching price range:', error);
    }
    return null;
  }
}
