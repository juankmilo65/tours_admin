/**
 * Currency Config Business Logic
 * Fetches the per-currency Stripe config (rates, fixed fees, minimums, methods)
 * from the backend — the single source of truth. See GET /api/config/currencies.
 * The front consumes this and never hardcodes the currency/fee table.
 */

import type { CurrenciesConfigResponse } from '~/types/currencyConfig';

const API_BASE_URL = 'http://localhost:3000';

export const getCurrenciesConfigBusiness = async (
  token?: string,
  language = 'es'
): Promise<{ success: boolean; data?: CurrenciesConfigResponse; error?: string }> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Language': language,
    };
    if (typeof token === 'string' && token.length > 0) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await globalThis.fetch(`${API_BASE_URL}/api/config/currencies`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      return {
        success: false,
        error: errorData.error ?? errorData.message ?? 'Failed to load currencies config',
      };
    }

    const data = (await response.json()) as CurrenciesConfigResponse;
    if (Array.isArray(data.currencies)) {
      return {
        success: true,
        data: { currencies: data.currencies, taxRates: data.taxRates ?? {} },
      };
    }
    return { success: false, error: 'Malformed currencies config response' };
  } catch (error) {
    console.error('Error in getCurrenciesConfigBusiness:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load currencies config',
    };
  }
};
