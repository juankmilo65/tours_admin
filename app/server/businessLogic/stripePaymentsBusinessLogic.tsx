/**
 * Stripe Payments Business Logic
 * Handles API calls for Stripe payment reports and breakdowns
 */

import type { StripePaymentsBreakdown, StripePaymentsFilters } from '~/types/stripePayments';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Get Stripe payments breakdown report
 */
export const getStripePaymentsBreakdownBusiness = async (
  filters: StripePaymentsFilters,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; data?: StripePaymentsBreakdown; error?: unknown }> => {
  try {
    if (typeof token !== 'string' || token.length === 0) {
      return {
        success: false,
        error: 'No authentication token provided',
      };
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append('from', filters.from);
    params.append('to', filters.to);

    if (typeof filters.ownerId === 'string' && filters.ownerId.length > 0) {
      params.append('ownerId', filters.ownerId);
    }

    if (typeof filters.commissionStatus === 'string' && filters.commissionStatus.length > 0) {
      params.append('commissionStatus', filters.commissionStatus);
    }

    if (typeof filters.paymentType === 'string' && filters.paymentType.length > 0) {
      params.append('paymentType', filters.paymentType);
    }

    if (typeof filters.isDeposit === 'boolean') {
      params.append('isDeposit', String(filters.isDeposit));
    }

    if (typeof filters.page === 'number' && filters.page > 0) {
      params.append('page', String(filters.page));
    }

    if (typeof filters.limit === 'number' && filters.limit > 0) {
      params.append('limit', String(filters.limit));
    }

    params.append('language', language);

    // Using fetch from node globals in server context
    const response = await globalThis.fetch(
      `${API_BASE_URL}/api/reports/stripe-payments-breakdown?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string; message?: string };
      return {
        success: false,
        error: errorData.error ?? errorData.message ?? 'Failed to fetch Stripe payments',
      };
    }

    const data = (await response.json()) as StripePaymentsBreakdown;

    if (data.success === true) {
      return {
        success: true,
        data,
      };
    }

    return {
      success: false,
      error: 'Failed to fetch Stripe payments breakdown',
    };
  } catch (error) {
    console.error('Error in getStripePaymentsBreakdownBusiness:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Stripe payments',
    };
  }
};
