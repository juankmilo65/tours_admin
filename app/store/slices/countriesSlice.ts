/**
 * Countries Slice
 * Manages countries state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Country {
  id: string;
  code: string;
  name: string;
  flag?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CountriesState {
  countries: Country[];
  selectedCountry: Country | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CountriesState = {
  countries: [],
  selectedCountry: null,
  isLoading: false,
  error: null,
};

const countriesSlice = createSlice({
  name: 'countries',
  initialState,
  reducers: {
    fetchCountriesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchCountriesSuccess: (state, action: PayloadAction<Country[]>) => {
      state.countries = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchCountriesFailure: (state, action: PayloadAction<string>) => {
      state.countries = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    addCountry: (state, action: PayloadAction<Country>) => {
      state.countries.push(action.payload);
    },
    updateCountry: (state, action: PayloadAction<Country>) => {
      const index = state.countries.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.countries[index] = action.payload;
      }
    },
    deleteCountry: (state, action: PayloadAction<string>) => {
      state.countries = state.countries.filter((c) => c.id !== action.payload);
    },
    setSelectedCountry: (state, action: PayloadAction<Country | null>) => {
      state.selectedCountry = action.payload;
    },
    setSelectedCountryByCode: (state, action: PayloadAction<string>) => {
      const country = state.countries.find((c) => c.code === action.payload);
      state.selectedCountry = country || null;
    },
    clearCountriesError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchCountriesStart,
  fetchCountriesSuccess,
  fetchCountriesFailure,
  addCountry,
  updateCountry,
  deleteCountry,
  setSelectedCountry,
  setSelectedCountryByCode,
  clearCountriesError,
} = countriesSlice.actions;

// Selectors
export const selectCountries = (state: { country: CountriesState }) => state.country.countries;
export const selectCountriesLoading = (state: { country: CountriesState }) => state.country.isLoading;
export const selectCountriesError = (state: { country: CountriesState }) => state.country.error;
export const selectSelectedCountry = (state: { country: CountriesState }) => state.country.selectedCountry;

export default countriesSlice.reducer;
