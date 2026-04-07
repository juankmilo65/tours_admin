/**
 * KYC Slice
 * Manages KYC verification state for owners
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { KycStatus } from '~/types/kyc';

interface KycState {
  status: KycStatus | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: KycState = {
  status: null,
  loading: false,
  error: null,
  lastFetched: null,
};

const kycSlice = createSlice({
  name: 'kyc',
  initialState,
  reducers: {
    fetchKycStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchKycSuccess: (state, action: PayloadAction<KycStatus>) => {
      state.status = action.payload;
      state.loading = false;
      state.lastFetched = Date.now();
    },
    fetchKycError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    updateKycStatus: (state, action: PayloadAction<KycStatus>) => {
      state.status = action.payload;
    },
  },
});

export const { fetchKycStart, fetchKycSuccess, fetchKycError, updateKycStatus } = kycSlice.actions;

// Selectors
export const selectKycStatus = (state: { kyc: KycState }): KycStatus | null => state.kyc.status;
export const selectKycLoading = (state: { kyc: KycState }): boolean => state.kyc.loading;
export const selectKycError = (state: { kyc: KycState }): string | null => state.kyc.error;

export default kycSlice.reducer;
