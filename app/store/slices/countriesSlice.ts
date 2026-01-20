/**
 * Countries Slice
 * Manages countries state with multi-language support
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Language } from '~/lib/i18n/types';

// Raw country from API with both languages
export interface Country {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
  description_es?: string;
  description_en?: string;
  flagUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Translated country for display
export interface TranslatedCountry {
  id: string;
  code: string;
  name: string;
  description?: string;
  flagUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Translation helper function
export function translateCountry(country: Country, lang: Language): TranslatedCountry {
  return {
    id: country.id,
    code: country.code,
    name: lang === 'es' ? country.name_es : country.name_en,
    description: lang === 'es' ? country.description_es : country.description_en,
    flagUrl: country.flagUrl,
    isActive: country.isActive,
    createdAt: country.createdAt,
    updatedAt: country.updatedAt,
  };
}

export function translateCountries(countries: Country[], lang: Language): TranslatedCountry[] {
  return countries.map((country) => translateCountry(country, lang));
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
      state.selectedCountry = country ?? null;
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
export const selectCountries = (state: { country: CountriesState }): Country[] =>
  state.country.countries;
export const selectCountriesLoading = (state: { country: CountriesState }): boolean =>
  state.country.isLoading;
export const selectCountriesError = (state: { country: CountriesState }): string | null =>
  state.country.error;
export const selectSelectedCountry = (state: { country: CountriesState }): Country | null =>
  state.country.selectedCountry;
export const selectSelectedCountryId = (state: { country: CountriesState }): string | null =>
  state.country.selectedCountry?.id ?? null;

export default countriesSlice.reducer;
