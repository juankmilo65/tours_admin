/**
 * Tours Slice
 * Manages tours state - UI state only, data fetching is handled by Remix loaders
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Tour, Pagination, TourFilters } from '~/types/PayloadTourDataProps';

interface ToursState {
  tours: Tour[];
  selectedTour: Tour | null;
  isLoading: boolean;
  error: string | null;
  filters: TourFilters;
  pagination: Pagination;
}

const initialState: ToursState = {
  tours: [],
  selectedTour: null,
  isLoading: false,
  error: null,
  filters: {
    cityId: '',
    category: '',
    difficulty: '',
    minPrice: '',
    maxPrice: '',
    page: '1',
    limit: '10',
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
};

const toursSlice = createSlice({
  name: 'tours',
  initialState,
  reducers: {
    setTours: (state, action: PayloadAction<Tour[]>) => {
      state.tours = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setPagination: (state, action: PayloadAction<Pagination>) => {
      state.pagination = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<TourFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setSelectedTour: (state, action: PayloadAction<Tour | null>) => {
      state.selectedTour = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
});

export const {
  setTours,
  setPagination,
  setFilters,
  setPage,
  setSelectedTour,
  setLoading,
  setError,
  clearError,
  clearFilters,
} = toursSlice.actions;

export default toursSlice.reducer;
