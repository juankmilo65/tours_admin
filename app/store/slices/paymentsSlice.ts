/**
 * Payments Slice
 * Manages payment polling and status tracking
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { PaymentRecord } from '~/types/payment';

interface PaymentsState {
  payments: Record<string, PaymentRecord>;
  pollingBookingIds: string[];
  loading: boolean;
  error: string | null;
  lastPolledAt: Record<string, number>;
}

const initialState: PaymentsState = {
  payments: {},
  pollingBookingIds: [],
  loading: false,
  error: null,
  lastPolledAt: {},
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    startPolling: (state, action: PayloadAction<string>) => {
      if (!state.pollingBookingIds.includes(action.payload)) {
        state.pollingBookingIds.push(action.payload);
      }
    },
    stopPolling: (state, action: PayloadAction<string>) => {
      state.pollingBookingIds = state.pollingBookingIds.filter((id) => id !== action.payload);
    },
    updatePaymentStatus: (
      state,
      action: PayloadAction<{
        bookingId: string;
        payment: PaymentRecord;
      }>
    ) => {
      state.payments[action.payload.bookingId] = action.payload.payment;
      state.lastPolledAt[action.payload.bookingId] = Date.now();
    },
    paymentError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearPaymentError: (state) => {
      state.error = null;
    },
  },
});

export const { startPolling, stopPolling, updatePaymentStatus, paymentError, clearPaymentError } =
  paymentsSlice.actions;

// Selectors
export const selectPaymentByBookingId = (
  state: { payments: PaymentsState },
  bookingId: string
): PaymentRecord | undefined => state.payments.payments[bookingId];
export const selectIsPolling = (state: { payments: PaymentsState }, bookingId: string): boolean =>
  state.payments.pollingBookingIds.includes(bookingId);
export const selectPaymentsLoading = (state: { payments: PaymentsState }): boolean =>
  state.payments.loading;
export const selectPaymentsError = (state: { payments: PaymentsState }): string | null =>
  state.payments.error;

export default paymentsSlice.reducer;
