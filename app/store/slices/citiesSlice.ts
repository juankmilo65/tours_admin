/**
 * Cities Slice
 * Manages cities state with multi-language support
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Language } from '~/lib/i18n/types';

// Raw city from API with both languages
export interface City {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  description_es?: string;
  description_en?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  countryId: string;
}

// Translated city for display
export interface TranslatedCity {
  id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  countryId: string;
}

// Translation helper functions
export function translateCity(city: City, lang: Language): TranslatedCity {
  return {
    id: city.id,
    slug: city.slug,
    name: lang === 'es' ? city.name_es : city.name_en,
    description: lang === 'es' ? city.description_es : city.description_en,
    imageUrl: city.imageUrl,
    isActive: city.isActive,
    createdAt: city.createdAt,
    updatedAt: city.updatedAt,
    countryId: city.countryId,
  };
}

export function translateCities(cities: City[], lang: Language): TranslatedCity[] {
  return cities.map((city) => translateCity(city, lang));
}

interface CitiesState {
  cities: City[];
  selectedCity: City | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CitiesState = {
  cities: [],
  selectedCity: null,
  isLoading: false,
  error: null,
};

const citiesSlice = createSlice({
  name: 'cities',
  initialState,
  reducers: {
    fetchCitiesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchCitiesSuccess: (state, action: PayloadAction<City[]>) => {
      state.cities = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchCitiesFailure: (state, action: PayloadAction<string>) => {
      state.cities = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    addCity: (state, action: PayloadAction<City>) => {
      state.cities.push(action.payload);
    },
    updateCity: (state, action: PayloadAction<City>) => {
      const index = state.cities.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.cities[index] = action.payload;
      }
    },
    deleteCity: (state, action: PayloadAction<string>) => {
      state.cities = state.cities.filter((c) => c.id !== action.payload);
    },
    setSelectedCity: (state, action: PayloadAction<City | null>) => {
      state.selectedCity = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchCitiesStart,
  fetchCitiesSuccess,
  fetchCitiesFailure,
  addCity,
  updateCity,
  deleteCity,
  setSelectedCity,
  clearError,
} = citiesSlice.actions;

// Selectors
export const selectCities = (state: { city: CitiesState }): City[] => state.city.cities;
export const selectCitiesLoading = (state: { city: CitiesState }): boolean => state.city.isLoading;
export const selectCitiesError = (state: { city: CitiesState }): string | null => state.city.error;
export const selectSelectedCity = (state: { city: CitiesState }): City | null =>
  state.city.selectedCity;

export default citiesSlice.reducer;
