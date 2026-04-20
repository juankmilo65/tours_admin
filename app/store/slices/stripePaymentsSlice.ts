/**
 * Stripe Payments Slice
 * Manages Stripe payments breakdown and statistics
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type {
  StripePaymentsBreakdown,
  StripePaymentsSummary,
  StripePaymentItem,
} from '~/types/stripePayments';

interface StripePaymentsState {
  data: StripePaymentsBreakdown | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: StripePaymentsState = {
  data: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

const stripePaymentsSlice = createSlice({
  name: 'stripePayments',
  initialState,
  reducers: {
    fetchStripePaymentsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchStripePaymentsSuccess: (state, action: PayloadAction<StripePaymentsBreakdown>) => {
      state.loading = false;
      state.data = action.payload;
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    fetchStripePaymentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearStripePayments: (state) => {
      state.data = null;
      state.error = null;
      state.lastUpdated = null;
    },
  },
});

export const {
  fetchStripePaymentsStart,
  fetchStripePaymentsSuccess,
  fetchStripePaymentsFailure,
  clearStripePayments,
} = stripePaymentsSlice.actions;

// Selectors
export const selectStripePaymentsData = (state: {
  stripePayments: StripePaymentsState;
}): StripePaymentsBreakdown | null => state.stripePayments.data;

export const selectStripePaymentsSummary = (state: {
  stripePayments: StripePaymentsState;
}): StripePaymentsSummary | undefined => state.stripePayments.data?.summary;

export const selectStripePaymentsBreakdown = (state: {
  stripePayments: StripePaymentsState;
}): StripePaymentItem[] | undefined => state.stripePayments.data?.breakdown;

export const selectStripePaymentsLoading = (state: {
  stripePayments: StripePaymentsState;
}): boolean => state.stripePayments.loading;

export const selectStripePaymentsError = (state: {
  stripePayments: StripePaymentsState;
}): string | null => state.stripePayments.error;

export default stripePaymentsSlice.reducer;
