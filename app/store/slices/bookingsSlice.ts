/**
 * Bookings Slice
 * Manages bookings and payments state
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Booking, Payment, BookingFilters, BookingStats } from '~/types/booking';

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
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
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
} = bookingsSlice.actions;

export default bookingsSlice.reducer;
