/**
 * Currency Config Slice
 * Holds the per-currency Stripe config fetched from the backend
 * (GET /api/config/currencies). Single source of truth for fees, minimums,
 * decimals, and available methods per currency.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '~/store';
import type { CurrenciesConfigResponse, CurrencyConfig } from '~/types/currencyConfig';

interface CurrencyConfigState {
  currencies: CurrencyConfig[];
  taxRates: Record<string, number>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: CurrencyConfigState = {
  currencies: [],
  taxRates: {},
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
    fetchCurrencyConfigSuccess: (state, action: PayloadAction<CurrenciesConfigResponse>) => {
      state.currencies = action.payload.currencies;
      state.taxRates = action.payload.taxRates ?? {};
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

export const selectTaxRates = (state: RootState): Record<string, number> =>
  state.currencyConfig.taxRates;

/** Selector factory: IVA rate for a country (ISO code); 0 if unknown. */
export const selectTaxRateForCountry =
  (countryCode: string) =>
  (state: RootState): number =>
    state.currencyConfig.taxRates[countryCode] ?? 0;

export default currencyConfigSlice.reducer;
