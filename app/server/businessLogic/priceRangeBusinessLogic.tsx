/**
 * Price Range Business Logic
 * Handles price range operations following to established architecture pattern
 */

import {
  getPriceRange,
  type PriceRangeFilters,
  type PriceRangeResponse,
} from '~/server/priceRange';

export interface PriceRangeBusinessResult {
  success: boolean;
  data: PriceRangeResponse | null;
  error?: string;
}

/**
 * Action router for price range business logic
 */

export function priceRangeBL(formData: FormData): Promise<PriceRangeBusinessResult> {
  const action = formData.get('action') as string;

  const ACTIONS: Record<string, () => Promise<PriceRangeBusinessResult>> = {
    getPriceRangeBusiness: async () => {
      const filtersStr = formData.get('filters') as string;
      const language = (formData.get('language') as string) ?? 'es';
      const currency = (formData.get('currency') as string) ?? 'MXN';

      let filters: PriceRangeFilters = {};

      if (filtersStr !== null && filtersStr !== undefined && filtersStr.trim().length > 0) {
        try {
          filters = JSON.parse(filtersStr) as PriceRangeFilters;
        } catch (e) {
          console.error('Error parsing price range filters:', e);
        }
      }

      const data = await getPriceRange(filters, language, currency);

      if (data !== null && data !== undefined) {
        return {
          success: true,
          data,
        };
      }

      return {
        success: false,
        data: null,
        error: 'Failed to fetch price range',
      };
    },
  };

  const actionHandler = ACTIONS[action];

  if (!actionHandler) {
    return {
      success: false,
      data: null,
      error: `Unknown action: ${action}`,
    };
  }

  return actionHandler();
}
