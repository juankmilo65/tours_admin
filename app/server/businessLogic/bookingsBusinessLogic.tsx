/**
 * Bookings Business Logic - Business layer for Booking Management
 */

import type { Booking, Payment, BookingStats } from '~/types/booking';
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingStats,
  getBookingPayments,
  createPayment,
} from '../bookings';

export type { Booking, Payment, BookingStats };

export interface BookingsResponse {
  success: boolean;
  data?: Booking[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: unknown;
}

export interface GetBookingsParams {
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
}

/**
 * Get all bookings with filters and pagination
 */
export const getAllBookingsBusiness = async (
  params?: GetBookingsParams
): Promise<BookingsResponse> => {
  try {
    const result = (await getAllBookings(params ?? {})) as BookingsResponse;

    if (result.success === true && result.data !== undefined) {
      return result;
    }

    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  } catch (error) {
    console.error('Error in getAllBookingsBusiness:', error);
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }
};

/**
 * Get booking by ID
 */
export const getBookingByIdBusiness = async (
  bookingId: string,
  token: string,
  language = 'es'
): Promise<Booking | null> => {
  try {
    const result = (await getBookingById(bookingId, token, language)) as {
      success?: boolean;
      data?: Booking;
    };

    if (result.success === true && result.data !== undefined) {
      return result.data;
    }

    return null;
  } catch (error) {
    console.error('Error in getBookingByIdBusiness:', error);
    return null;
  }
};

/**
 * Create new booking
 */
export const createBookingBusiness = async (
  bookingData: Partial<Booking>,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string; data?: Booking }> => {
  try {
    const result = (await createBooking(bookingData, token ?? '', language)) as {
      success?: boolean;
      message?: string;
      data?: Booking;
      error?: {
        message?: string;
        response?: { data?: { message?: string } };
        code?: string;
        status?: number;
      };
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; message?: string; data?: Booking };
    }

    // Extract error message from various possible structures
    let errorMessage = 'Error creating booking';

    if (result.message !== undefined) {
      errorMessage = result.message;
    } else if (result.error !== undefined) {
      if (result.error.message !== undefined) {
        errorMessage = result.error.message;
      } else if (result.error.response?.data?.message !== undefined) {
        errorMessage = result.error.response.data.message;
      } else {
        // Fallback: use the error object itself if it's a string
        errorMessage = String(result.error);
      }
    }

    return {
      success: false,
      message: errorMessage,
    };
  } catch (error) {
    console.error('❌ [createBookingBusiness] Exception caught:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error creating booking',
    };
  }
};

/**
 * Update booking
 */
export const updateBookingBusiness = async (
  bookingId: string,
  bookingData: Partial<Booking>,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string; data?: Booking }> => {
  try {
    const result = (await updateBooking(bookingId, bookingData, token ?? '', language)) as {
      success?: boolean;
      message?: string;
      data?: Booking;
      error?: { message?: string };
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; message?: string; data?: Booking };
    }

    return {
      success: false,
      message: result.message ?? result.error?.message ?? 'Error updating booking',
    };
  } catch (error) {
    console.error('Error in updateBookingBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error updating booking',
    };
  }
};

/**
 * Cancel booking (soft delete)
 */
export const deleteBookingBusiness = async (
  bookingId: string,
  cancellationReason: string,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string }> => {
  try {
    const result = (await deleteBooking(bookingId, cancellationReason, token ?? '', language)) as {
      success?: boolean;
      message?: string;
      error?: { message?: string };
    };

    if (result.success === true) {
      return result as { success: boolean; message?: string };
    }

    return {
      success: false,
      message: result.message ?? result.error?.message ?? 'Error cancelling booking',
    };
  } catch (error) {
    console.error('Error in deleteBookingBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error cancelling booking',
    };
  }
};

/**
 * Get booking statistics
 */
export const getBookingStatsBusiness = async (
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; data?: BookingStats; error?: unknown }> => {
  try {
    const result = (await getBookingStats(token ?? '', language)) as {
      success?: boolean;
      data?: BookingStats;
      error?: unknown;
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; data?: BookingStats };
    }

    return {
      success: false,
      data: undefined,
    };
  } catch (error) {
    console.error('Error in getBookingStatsBusiness:', error);
    return {
      success: false,
      data: undefined,
    };
  }
};

/**
 * Get payments for a booking
 */
export const getBookingPaymentsBusiness = async (
  bookingId: string,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; data?: Payment[] }> => {
  try {
    const result = (await getBookingPayments(bookingId, token ?? '', language)) as {
      success?: boolean;
      data?: Payment[];
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; data?: Payment[] };
    }

    return { success: false, data: [] };
  } catch (error) {
    console.error('Error in getBookingPaymentsBusiness:', error);
    return { success: false, data: [] };
  }
};

/**
 * Create payment for a booking
 */
export const createPaymentBusiness = async (
  paymentData: Partial<Payment>,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string; data?: Payment }> => {
  try {
    const result = (await createPayment(paymentData, token ?? '', language)) as {
      success?: boolean;
      message?: string;
      data?: Payment;
      error?: { message?: string };
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; message?: string; data?: Payment };
    }

    return {
      success: false,
      message: result.message ?? result.error?.message ?? 'Error creating payment',
    };
  } catch (error) {
    console.error('Error in createPaymentBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error creating payment',
    };
  }
};
