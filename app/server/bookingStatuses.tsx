/**
 * Booking Statuses Service
 * Handles API calls for booking statuses
 */

import { createServiceREST } from './_index';
import type { BookingStatusResponse } from '~/types/bookingStatus';

// Type declaration for Vite environment variables
interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

/**
 * Fetch all booking statuses
 */
export const getBookingStatusesService = async (
  token?: string,
  language = 'es'
): Promise<BookingStatusResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return {
      success: false,
      data: null,
      error: 'Backend URL not configured',
      message: 'Backend URL is not configured',
    };
  }

  try {
    const statusesEndpoint = 'booking-statuses';
    const statusesService = createServiceREST(BASE_URL, statusesEndpoint, `Bearer ${token ?? ''}`);

    const result = await statusesService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result as BookingStatusResponse;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET BOOKING STATUSES] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET BOOKING STATUSES] Unknown error:', error);
    }
    return {
      success: false,
      data: null,
      error: 'Error fetching booking statuses',
      message: 'An unexpected error occurred while fetching booking statuses',
    };
  }
};
