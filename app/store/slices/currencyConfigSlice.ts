/**
 * Currency Config Slice
 * Holds the per-currency Stripe config fetched from the backend
 * (GET /api/config/currencies). Single source of truth for fees, minimums,
 * decimals, and available methods per currency.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '~/store';
import type { CurrencyConfig } from '~/types/currencyConfig';

interface CurrencyConfigState {
  currencies: CurrencyConfig[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: CurrencyConfigState = {
  currencies: [],
  loading: false,
  loaded: false,
  error: null,
};

const currencyConfigSlice = createSlice({
  name: 'currencyConfig',
  initialState,
  reducers: {
    fetchCurrencyConfigStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchCurrencyConfigSuccess: (state, action: PayloadAction<CurrencyConfig[]>) => {
      state.currencies = action.payload;
      state.loading = false;
      state.loaded = true;
      state.error = null;
    },
    fetchCurrencyConfigFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchCurrencyConfigStart, fetchCurrencyConfigSuccess, fetchCurrencyConfigFailure } =
  currencyConfigSlice.actions;

export const selectCurrencies = (state: RootState): CurrencyConfig[] =>
  state.currencyConfig.currencies;
export const selectCurrencyConfigLoading = (state: RootState): boolean =>
  state.currencyConfig.loading;
export const selectCurrencyConfigLoaded = (state: RootState): boolean =>
  state.currencyConfig.loaded;
export const selectCurrencyConfigError = (state: RootState): string | null =>
  state.currencyConfig.error;

/** Selector factory: find the config for a given currency code. */
export const selectCurrencyByCode =
  (code: string) =>
  (state: RootState): CurrencyConfig | undefined =>
    state.currencyConfig.currencies.find((c) => c.code === code);

export default currencyConfigSlice.reducer;
