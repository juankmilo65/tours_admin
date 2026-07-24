/**
 * Bookings Business Logic - Business layer for Booking Management
 */

import type {
  Booking,
  Payment,
  BookingStats,
  BookingStatusHistory,
  BookingStatusHistoryEntry,
  CreateBookingDto,
  FeeBreakdown,
} from '~/types/booking';
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  updateBookingPaymentStatus,
  deleteBooking,
  getBookingStats,
  getBookingPayments,
  createPayment,
  completePayment,
  getBookingStatusHistory,
  resendPaymentLink,
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

export interface BookingByIdResponse {
  success: boolean;
  data?: Booking;
  error?: string;
}

/**
 * Get booking by ID
 */
export const getBookingByIdBusiness = async (
  bookingId: string,
  token: string,
  language = 'es'
): Promise<BookingByIdResponse> => {
  try {
    const result = (await getBookingById(bookingId, token, language)) as {
      success?: boolean;
      data?: Booking;
      error?: unknown;
    };

    if (result.success === true && result.data !== undefined) {
      return { success: true, data: result.data };
    }

    // Extract error message from response
    let errorMessage = language === 'en' ? 'Booking not found' : 'Reserva no encontrada';
    if (result.error !== undefined) {
      const err = result.error as {
        response?: { data?: { error?: string }; status?: number };
        message?: string;
      };
      const status = err.response?.status;
      if (status === 404) {
        errorMessage = language === 'en' ? 'Booking not found' : 'Reserva no encontrada';
      } else if (status === 403) {
        errorMessage =
          language === 'en'
            ? 'You do not have access to this booking'
            : 'No tienes acceso a esta reserva';
      } else if (status === 401) {
        errorMessage = language === 'en' ? 'Authentication required' : 'Autenticación requerida';
      } else if (err.response?.data?.error !== undefined) {
        errorMessage = err.response.data.error;
      } else if (err.message !== undefined) {
        errorMessage = err.message;
      }
    }

    return { success: false, error: errorMessage };
  } catch (error) {
    console.error('Error in getBookingByIdBusiness:', error);
    return {
      success: false,
      error: language === 'en' ? 'Error loading booking' : 'Error al cargar la reserva',
    };
  }
};

/**
 * Create new booking
 */
export const createBookingBusiness = async (
  bookingData: CreateBookingDto,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string; data?: Booking }> => {
  try {
    const result = (await createBooking(bookingData, token ?? '', language)) as {
      success?: boolean;
      message?: string;
      data?: Booking;
      error?: string;
      status?: number;
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; message?: string; data?: Booking };
    }

    const status = result.status;
    let message =
      result.message ??
      result.error ??
      (language === 'en' ? 'Error creating booking' : 'Error al crear la reserva');
    if (status === 422) {
      // Backend recomputed net/IVA and the front's totalAmount did not reconcile:
      // the price breakdown is out of sync (see the calculateBookingTotal IVA bug).
      console.error('❌ [createBookingBusiness] 422 fee/total mismatch:', result.error);
      message =
        language === 'en'
          ? 'The total to charge does not match the backend calculation (price breakdown out of sync). Please review and retry.'
          : 'El total a cobrar no coincide con el cálculo del backend (desglose de precios desalineado). Revisá y reintentá.';
    } else if (status === 400) {
      message =
        language === 'en'
          ? 'The booking request was rejected by validation (malformed payload).'
          : 'La solicitud de reserva fue rechazada por validación (payload inválido).';
    }
    return { success: false, message };
  } catch (error) {
    console.error('❌ [createBookingBusiness] Exception caught:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error creating booking',
    };
  }
};

/**
 * Start an online payment for a booking's remaining balance. Returns the Stripe
 * payment link to redirect the customer to. The customer covers the Stripe fee.
 */
export const completePaymentBusiness = async (
  bookingId: string,
  feeBreakdown: FeeBreakdown,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; url?: string; message?: string }> => {
  try {
    const result = (await completePayment(bookingId, feeBreakdown, token ?? '', language)) as {
      success?: boolean;
      url?: string;
      link?: string;
      paymentUrl?: string;
      checkoutUrl?: string;
      redirectUrl?: string;
      data?: { url?: string; link?: string; paymentUrl?: string; checkoutUrl?: string };
      error?: string;
      status?: number;
    };

    if (result.success === true) {
      // Backend response field name is not final — accept the common variants.
      const url =
        result.url ??
        result.link ??
        result.paymentUrl ??
        result.checkoutUrl ??
        result.redirectUrl ??
        result.data?.url ??
        result.data?.link ??
        result.data?.paymentUrl ??
        result.data?.checkoutUrl;
      if (url !== undefined && url !== '') {
        return { success: true, url };
      }
      console.error('❌ [completePaymentBusiness] no payment link in response:', result);
      return {
        success: false,
        message:
          language === 'en'
            ? 'The server did not return a payment link.'
            : 'El servidor no devolvió el link de pago.',
      };
    }

    const status = result.status;
    let message =
      result.error ??
      (language === 'en' ? 'Error starting the payment' : 'Error al iniciar el pago');
    if (status === 422) {
      console.error('❌ [completePaymentBusiness] 422 fee/total mismatch:', result.error);
      message =
        language === 'en'
          ? 'The total to charge does not match the backend calculation. Please retry.'
          : 'El total a cobrar no coincide con el cálculo del backend. Reintentá.';
    } else if (status === 400) {
      message =
        language === 'en'
          ? 'The payment request was rejected by validation (malformed payload).'
          : 'La solicitud de pago fue rechazada por validación (payload inválido).';
    } else if (status === 403) {
      message =
        language === 'en'
          ? 'You are not allowed to start this payment.'
          : 'No tenés permiso para iniciar este pago.';
    } else if (status === 409) {
      message =
        language === 'en'
          ? 'The balance cannot be charged: it may already be settled or a payment is in progress.'
          : 'No se puede cobrar el saldo: puede estar ya liquidado o con un pago en curso.';
    } else if (status === 404) {
      message = language === 'en' ? 'Booking not found' : 'Reserva no encontrada';
    }
    return { success: false, message };
  } catch (error) {
    console.error('Error in completePaymentBusiness:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error starting the payment',
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
      error?: {
        message?: string;
        response?: { data?: { error?: string; message?: string } };
      };
    };

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; message?: string; data?: Booking };
    }

    // Extract error message: prioritize API response data over generic axios message
    let errorMessage = 'Error updating booking';
    if (result.message !== undefined) {
      errorMessage = result.message;
    } else if (result.error !== undefined) {
      const responseData = result.error.response?.data;
      if (responseData?.error !== undefined) {
        errorMessage = responseData.error;
      } else if (responseData?.message !== undefined) {
        errorMessage = responseData.message;
      } else if (typeof result.error === 'string') {
        errorMessage = result.error as string;
      } else if (result.error.message !== undefined) {
        errorMessage = result.error.message;
      }
    }

    return {
      success: false,
      message: errorMessage,
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
 * Register cash payment for a booking's balance
 * Transitions the booking to 'paid' via the payment-status endpoint.
 * The backend computes the authoritative settled amount.
 */
export const registerCashPaymentBusiness = async (
  bookingId: string,
  token: string | undefined,
  language = 'es'
): Promise<{ success: boolean; message?: string; data?: Booking }> => {
  try {
    const result = (await updateBookingPaymentStatus(bookingId, 'paid', token ?? '', language)) as {
      success?: boolean;
      message?: string;
      data?: Booking;
      error?: {
        response?: { data?: { error?: string }; status?: number };
        message?: string;
      };
    };

    if (result.success === true) {
      return { success: true, message: result.message, data: result.data };
    }

    // Map HTTP status -> bilingual message (mirrors getBookingByIdBusiness's style)
    let errorMessage =
      language === 'en'
        ? 'Error registering cash payment'
        : 'Error al registrar el pago en efectivo';
    if (result.error !== undefined) {
      const err = result.error;
      const status = err.response?.status;
      if (status === 403) {
        errorMessage =
          language === 'en'
            ? 'You are not an owner of any tour in this booking'
            : 'No sos dueño de ningún tour de esta reserva';
      } else if (status === 409) {
        errorMessage =
          language === 'en'
            ? 'The balance cannot be settled in cash: it is already settled, a cash payment already exists, or an online payment is in progress'
            : 'No se puede liquidar en efectivo: el saldo ya se liquidó, ya existe un pago en efectivo, o hay un pago online en curso';
      } else if (status === 400) {
        errorMessage =
          language === 'en'
            ? 'Invalid state or the balance amount could not be calculated'
            : 'Estado inválido o no se pudo calcular el monto del saldo';
      } else if (status === 404) {
        errorMessage = language === 'en' ? 'Booking not found' : 'Reserva no encontrada';
      } else if (err.response?.data?.error !== undefined) {
        errorMessage = err.response.data.error;
      } else if (err.message !== undefined) {
        errorMessage = err.message;
      }
    }

    return { success: false, message: errorMessage };
  } catch (error) {
    console.error('Error in registerCashPaymentBusiness:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : language === 'en'
            ? 'Error registering cash payment'
            : 'Error al registrar el pago en efectivo',
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

export type { BookingStatusHistoryEntry };

/**
 * Get status history for a booking
 */
export const getBookingStatusHistoryBusiness = async (
  bookingId: string,
  token?: string,
  language = 'es'
): Promise<{ success: boolean; data: BookingStatusHistory | null }> => {
  try {
    const result = (await getBookingStatusHistory(bookingId, token, language)) as {
      success?: boolean;
      data?: BookingStatusHistory | null;
    };

    if (result.success === true) {
      return { success: true, data: result.data ?? null };
    }
    return { success: false, data: null };
  } catch (error) {
    console.error('Error in getBookingStatusHistoryBusiness:', error);
    return { success: false, data: null };
  }
};

/**
 * Resend payment link for a pending_payment booking
 */
export const resendPaymentLinkBusiness = async (
  bookingId: string,
  token: string,
  language = 'es'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const raw = await resendPaymentLink(bookingId, token, language);
    const result = raw as { success?: boolean; error?: string };

    if (result.success === false) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    console.error('Error in resendPaymentLinkBusiness:', error);
    return { success: false, error: 'Unexpected error' };
  }
};
