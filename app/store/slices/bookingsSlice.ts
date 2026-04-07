/**
 * Bookings Slice
 * Manages bookings and payments state
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Booking, BookingTour, Payment, BookingFilters, BookingStats } from '~/types/booking';

interface BookingsState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  payments: Payment[];
  stats: BookingStats | null;
  isLoading: boolean;
  error: string | null;
  filters: BookingFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  // Filter state management
  filtersChanged: boolean;
  hasSearched: boolean;
}

const initialState: BookingsState = {
  bookings: [],
  selectedBooking: null,
  payments: [],
  stats: null,
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filtersChanged: false,
  hasSearched: false,
};

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    fetchBookingsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchBookingsSuccess: (
      state,
      action: PayloadAction<{
        bookings: Booking[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>
    ) => {
      state.bookings = action.payload.bookings;
      state.pagination = action.payload.pagination;
      state.isLoading = false;
      state.error = null;
    },
    fetchBookingsFailure: (state, action: PayloadAction<string>) => {
      state.bookings = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchBookingByIdStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchBookingByIdSuccess: (state, action: PayloadAction<Booking>) => {
      state.selectedBooking = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchBookingByIdFailure: (state, action: PayloadAction<string>) => {
      state.selectedBooking = null;
      state.isLoading = false;
      state.error = action.payload;
    },
    createBookingStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    createBookingSuccess: (state, action: PayloadAction<Booking>) => {
      state.bookings.push(action.payload);
      state.isLoading = false;
      state.error = null;
    },
    createBookingFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateBookingStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    updateBookingSuccess: (state, action: PayloadAction<Booking>) => {
      const index = state.bookings.findIndex((b) => b.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
      if (state.selectedBooking?.id === action.payload.id) {
        state.selectedBooking = action.payload;
      }
      state.isLoading = false;
      state.error = null;
    },
    updateBookingFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    deleteBookingStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    deleteBookingSuccess: (state, action: PayloadAction<string>) => {
      state.bookings = state.bookings.filter((b) => b.id !== action.payload);
      if (state.selectedBooking?.id === action.payload) {
        state.selectedBooking = null;
      }
      state.isLoading = false;
      state.error = null;
    },
    deleteBookingFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchPaymentsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchPaymentsSuccess: (state, action: PayloadAction<Payment[]>) => {
      state.payments = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchPaymentsFailure: (state, action: PayloadAction<string>) => {
      state.payments = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    createPaymentStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    createPaymentSuccess: (state, action: PayloadAction<Payment>) => {
      state.payments.push(action.payload);
      if (state.selectedBooking?.payments) {
        state.selectedBooking.payments.push(action.payload);
      }
      state.isLoading = false;
      state.error = null;
    },
    createPaymentFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchStatsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchStatsSuccess: (state, action: PayloadAction<BookingStats>) => {
      state.stats = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchStatsFailure: (state, action: PayloadAction<string>) => {
      state.stats = null;
      state.isLoading = false;
      state.error = action.payload;
    },
    setSelectedBooking: (state, action: PayloadAction<Booking | null>) => {
      state.selectedBooking = action.payload;
    },
    clearSelectedBooking: (state) => {
      state.selectedBooking = null;
    },
    updateFilters: (state, action: PayloadAction<Partial<BookingFilters>>) => {
      // Mark filters as changed when they are modified (not silent)
      state.filtersChanged = true;
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    resetFiltersChanged: (state) => {
      state.filtersChanged = false;
    },
    setHasSearched: (state, action: PayloadAction<boolean>) => {
      state.hasSearched = action.payload;
    },
    updateMultiTourBooking: (
      state,
      action: PayloadAction<{
        bookingId: string;
        tours: BookingTour[];
      }>
    ) => {
      const booking = state.bookings.find((b) => b.id === action.payload.bookingId);
      if (booking) {
        booking.tours = action.payload.tours;
        if (booking.tours.length > 0) {
          booking.totalPrice = booking.tours.reduce((sum, t) => sum + (t.price ?? 0), 0);
        }
      }
    },
  },
});

export const {
  fetchBookingsStart,
  fetchBookingsSuccess,
  fetchBookingsFailure,
  fetchBookingByIdStart,
  fetchBookingByIdSuccess,
  fetchBookingByIdFailure,
  createBookingStart,
  createBookingSuccess,
  createBookingFailure,
  updateBookingStart,
  updateBookingSuccess,
  updateBookingFailure,
  deleteBookingStart,
  deleteBookingSuccess,
  deleteBookingFailure,
  fetchPaymentsStart,
  fetchPaymentsSuccess,
  fetchPaymentsFailure,
  createPaymentStart,
  createPaymentSuccess,
  createPaymentFailure,
  fetchStatsStart,
  fetchStatsSuccess,
  fetchStatsFailure,
  setSelectedBooking,
  clearSelectedBooking,
  updateFilters,
  clearError,
  resetFiltersChanged,
  setHasSearched,
  updateMultiTourBooking,
} = bookingsSlice.actions;

// Selectors
export const selectBookings = (state: { bookings: BookingsState }): Booking[] =>
  state.bookings.bookings;
export const selectSelectedBooking = (state: { bookings: BookingsState }): Booking | null =>
  state.bookings.selectedBooking;
export const selectPayments = (state: { bookings: BookingsState }): Payment[] =>
  state.bookings.payments;
export const selectBookingStats = (state: { bookings: BookingsState }): BookingStats | null =>
  state.bookings.stats;
export const selectBookingsIsLoading = (state: { bookings: BookingsState }): boolean =>
  state.bookings.isLoading;
export const selectBookingsError = (state: { bookings: BookingsState }): string | null =>
  state.bookings.error;
export const selectBookingsFilters = (state: { bookings: BookingsState }): BookingFilters =>
  state.bookings.filters;
export const selectBookingsPagination = (state: {
  bookings: BookingsState;
}): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} => state.bookings.pagination;
export const selectBookingsFiltersChanged = (state: { bookings: BookingsState }): boolean =>
  state.bookings.filtersChanged;
export const selectBookingsHasSearched = (state: { bookings: BookingsState }): boolean =>
  state.bookings.hasSearched;

export default bookingsSlice.reducer;
