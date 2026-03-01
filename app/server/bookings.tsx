/**
 * Bookings Service - HTTP layer for Bookings API
 */

import { createServiceREST } from './_index';
import type { Booking, Payment } from '~/types/booking';

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
 * Get all bookings with filters
 * Sends ALL parameters including empty ones as per API requirements
 */
export const getAllBookings = async (params: {
  page?: number;
  limit?: number;
  user_id?: string;
  tour_id?: string;
  booking_date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  confirmation_code?: string;
  country?: string;
  city_id?: string;
  token?: string;
  language?: string;
  currency?: string;
}): Promise<unknown> => {
  console.warn('🎯 [GET ALL BOOKINGS] Starting getAllBookings with params:', {
    params,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET ALL BOOKINGS] BACKEND_URL is not configured, returning empty');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }

  try {
    const { token, language, currency } = params;

    // Ensure all parameters are sent as empty strings if undefined
    const completeParams: Record<string, string> = {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 10),
      user_id: params.user_id ?? '',
      tour_id: params.tour_id ?? '',
      booking_date: params.booking_date ?? '',
      start_date: params.start_date ?? '',
      end_date: params.end_date ?? '',
      status: params.status ?? '',
      confirmation_code: params.confirmation_code ?? '',
      country: params.country ?? '',
      city_id: params.city_id ?? '',
    };

    const bookingsEndpoint = 'bookings';
    const bookingsService = createServiceREST(BASE_URL, bookingsEndpoint, `Bearer ${token ?? ''}`);

    const headers: Record<string, string> = {};
    if (language !== undefined) {
      headers['X-Language'] = language;
    }
    if (currency !== undefined) {
      headers['X-Currency'] = currency;
    }

    const result = await bookingsService.get({
      params: completeParams,
      headers,
    });

    console.warn('✅ [GET ALL BOOKINGS] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [GET ALL BOOKINGS] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET ALL BOOKINGS] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET ALL BOOKINGS] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET ALL BOOKINGS] Unknown error:', error);
    }
    return {
      error,
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (
  id: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  console.warn('🎯 [GET BOOKING BY ID] Starting getBookingById with params:', {
    id,
    language,
    hasToken: token !== '',
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET BOOKING BY ID] BACKEND_URL is not configured, returning empty');
    return { success: false, data: null };
  }

  try {
    const bookingEndpoint = `bookings/${id}`;
    const fullUrl = `${BASE_URL}/${bookingEndpoint}`;
    console.warn('🌐 [GET BOOKING BY ID] Full URL to call:', fullUrl);

    const bookingService = createServiceREST(BASE_URL, bookingEndpoint, `Bearer ${token}`);

    const result = await bookingService.get({
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [GET BOOKING BY ID] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [GET BOOKING BY ID] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET BOOKING BY ID] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET BOOKING BY ID] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET BOOKING BY ID] Unknown error:', error);
    }
    return { error, success: false, data: null };
  }
};

/**
 * Create new booking
 */
export const createBooking = async (
  payload: Partial<Booking>,
  token: string,
  language = 'es'
): Promise<unknown> => {
  console.warn('🎯 [CREATE BOOKING] Starting createBooking with params:', {
    payload,
    language,
    hasToken: !!token,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [CREATE BOOKING] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const bookingsEndpoint = 'bookings';
    const bookingsService = createServiceREST(BASE_URL, bookingsEndpoint, `Bearer ${token}`);

    const result = await bookingsService.create(payload, {
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [CREATE BOOKING] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [CREATE BOOKING] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [CREATE BOOKING] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [CREATE BOOKING] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [CREATE BOOKING] Unknown error:', error);
    }
    return { error, success: false };
  }
};

/**
 * Update booking
 */
export const updateBooking = async (
  id: string,
  payload: Partial<Booking>,
  token: string,
  language = 'es'
): Promise<unknown> => {
  console.warn('🎯 [UPDATE BOOKING] Starting updateBooking with params:', {
    id,
    payload,
    language,
    hasToken: !!token,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [UPDATE BOOKING] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const bookingsEndpoint = `bookings/${id}`;
    const bookingsService = createServiceREST(BASE_URL, bookingsEndpoint, `Bearer ${token}`);

    const result = await bookingsService.update(payload, {
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [UPDATE BOOKING] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [UPDATE BOOKING] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [UPDATE BOOKING] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [UPDATE BOOKING] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [UPDATE BOOKING] Unknown error:', error);
    }
    return { error, success: false };
  }
};

/**
 * Cancel booking (soft delete)
 */
export const deleteBooking = async (
  id: string,
  cancellationReason: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  console.warn('🎯 [DELETE BOOKING] Starting deleteBooking with params:', {
    id,
    cancellationReason,
    language,
    hasToken: !!token,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [DELETE BOOKING] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const bookingsEndpoint = `bookings/${id}`;
    const bookingsService = createServiceREST(BASE_URL, bookingsEndpoint, `Bearer ${token}`);

    const result = await bookingsService.update(
      {
        cancellationReason,
        isDeleted: true,
      },
      {
        headers: {
          'X-Language': language,
        },
      }
    );

    console.warn('✅ [DELETE BOOKING] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [DELETE BOOKING] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [DELETE BOOKING] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [DELETE BOOKING] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [DELETE BOOKING] Unknown error:', error);
    }
    return { error, success: false };
  }
};

/**
 * Get booking statistics
 */
export const getBookingStats = async (token: string, language = 'es'): Promise<unknown> => {
  console.warn('🎯 [GET BOOKING STATS] Starting getBookingStats with params:', {
    language,
    hasToken: !!token,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET BOOKING STATS] BACKEND_URL is not configured, returning empty');
    return { success: false, data: null };
  }

  try {
    const statsEndpoint = 'bookings/stats';
    const statsService = createServiceREST(BASE_URL, statsEndpoint, `Bearer ${token}`);

    const result = await statsService.get({
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [GET BOOKING STATS] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [GET BOOKING STATS] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET BOOKING STATS] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET BOOKING STATS] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET BOOKING STATS] Unknown error:', error);
    }
    return { error, success: false, data: null };
  }
};

/**
 * Get payments for a booking
 */
export const getBookingPayments = async (
  bookingId: string,
  token: string,
  language = 'es'
): Promise<unknown> => {
  console.warn('🎯 [GET BOOKING PAYMENTS] Starting getBookingPayments with params:', {
    bookingId,
    language,
    hasToken: !!token,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET BOOKING PAYMENTS] BACKEND_URL is not configured, returning empty');
    return { success: false, data: [] };
  }

  try {
    const paymentsEndpoint = `payments/booking/${bookingId}`;
    const paymentsService = createServiceREST(BASE_URL, paymentsEndpoint, `Bearer ${token}`);

    const result = await paymentsService.get({
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [GET BOOKING PAYMENTS] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [GET BOOKING PAYMENTS] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET BOOKING PAYMENTS] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET BOOKING PAYMENTS] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET BOOKING PAYMENTS] Unknown error:', error);
    }
    return { error, success: false, data: [] };
  }
};

/**
 * Create payment for a booking
 */
export const createPayment = async (
  payload: Partial<Payment>,
  token: string,
  language = 'es'
): Promise<unknown> => {
  console.warn('🎯 [CREATE PAYMENT] Starting createPayment with params:', {
    payload,
    language,
    hasToken: !!token,
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [CREATE PAYMENT] BACKEND_URL is not configured, returning error');
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const paymentsEndpoint = 'payments';
    const paymentsService = createServiceREST(BASE_URL, paymentsEndpoint, `Bearer ${token}`);

    const result = await paymentsService.create(payload, {
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [CREATE PAYMENT] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [CREATE PAYMENT] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [CREATE PAYMENT] Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [CREATE PAYMENT] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [CREATE PAYMENT] Unknown error:', error);
    }
    return { error, success: false };
  }
};
