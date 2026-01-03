/**
 * Cities Slice
 * Manages cities state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface City {
  id: string;
  name: string;
  country: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Country {
  code: string;
  name: string;
  flag?: string;
}

interface CitiesState {
  countries: Country[];
  cities: City[];
  selectedCity: City | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CitiesState = {
  countries: [],
  cities: [],
  selectedCity: null,
  isLoading: false,
  error: null,
};

const citiesSlice = createSlice({
  name: 'cities',
  initialState,
  reducers: {
    setCountries: (state, action: PayloadAction<Country[]>) => {
      state.countries = action.payload;
    },
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
  setCountries,
  fetchCitiesStart,
  fetchCitiesSuccess,
  fetchCitiesFailure,
  addCity,
  updateCity,
  deleteCity,
  setSelectedCity,
  clearError,
} = citiesSlice.actions;
export default citiesSlice.reducer;
