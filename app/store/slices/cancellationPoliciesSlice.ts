/**
 * Cancellation Policies Slice
 * Manages cancellation policy state
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { CancellationPolicy } from '~/types/cancellationPolicy';

interface CancellationPoliciesState {
  policies: CancellationPolicy[];
  loading: boolean;
  error: string | null;
}

const initialState: CancellationPoliciesState = {
  policies: [],
  loading: false,
  error: null,
};

const cancellationPoliciesSlice = createSlice({
  name: 'cancellationPolicies',
  initialState,
  reducers: {
    fetchPoliciesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchPoliciesSuccess: (state, action: PayloadAction<CancellationPolicy[]>) => {
      state.policies = action.payload;
      state.loading = false;
    },
    fetchPoliciesError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { fetchPoliciesStart, fetchPoliciesSuccess, fetchPoliciesError } =
  cancellationPoliciesSlice.actions;

// Selectors
export const selectCancellationPolicies = (state: {
  cancellationPolicies: CancellationPoliciesState;
}): CancellationPolicy[] => state.cancellationPolicies.policies;
export const selectCancellationPoliciesLoading = (state: {
  cancellationPolicies: CancellationPoliciesState;
}): boolean => state.cancellationPolicies.loading;
export const selectDefaultCancellationPolicy = (state: {
  cancellationPolicies: CancellationPoliciesState;
}): CancellationPolicy | undefined => state.cancellationPolicies.policies.find((p) => p.isActive);

export default cancellationPoliciesSlice.reducer;
