/**
 * Tours Slice
 * Manages tours state - including filters and data fetching
 * All filter state is managed here, not in URL params
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
  // Filter state management
  filtersChanged: boolean;
  hasSearched: boolean;
}

const initialState: ToursState = {
  tours: [],
  selectedTour: null,
  isLoading: false,
  error: null,
  filters: {
    userId: '',
    countryId: '',
    cityId: '',
    category: '',
    difficulty: '',
    minPrice: '',
    maxPrice: '',
    isActive: undefined,
    page: '1',
    limit: '10',
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  filtersChanged: false,
  hasSearched: false,
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
      // Mark filters as changed when they are modified (not silent)
      state.filtersChanged = true;
      state.filters = { ...state.filters, ...action.payload };
    },
    setFiltersSilently: (state, action: PayloadAction<Partial<TourFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
      state.filters.page = action.payload.toString();
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
      // Keep userId for non-admin users
      const userId = state.filters.userId;
      state.filters = { ...initialState.filters, userId };
      state.filtersChanged = false;
      state.hasSearched = false;
      state.tours = [];
      state.pagination = initialState.pagination;
    },
    resetFiltersChanged: (state) => {
      state.filtersChanged = false;
    },
    setHasSearched: (state, action: PayloadAction<boolean>) => {
      state.hasSearched = action.payload;
    },
  },
});

// Selectors
export const selectTours = (state: { tours: ToursState }): Tour[] => state.tours.tours;
export const selectToursFilters = (state: { tours: ToursState }): TourFilters =>
  state.tours.filters;
export const selectToursPagination = (state: { tours: ToursState }): Pagination =>
  state.tours.pagination;
export const selectToursFiltersChanged = (state: { tours: ToursState }): boolean =>
  state.tours.filtersChanged;
export const selectToursHasSearched = (state: { tours: ToursState }): boolean =>
  state.tours.hasSearched;
export const selectToursIsLoading = (state: { tours: ToursState }): boolean =>
  state.tours.isLoading;
export const selectToursError = (state: { tours: ToursState }): string | null => state.tours.error;

export const {
  setTours,
  setPagination,
  setFilters,
  setFiltersSilently,
  setPage,
  setSelectedTour,
  setLoading,
  setError,
  clearError,
  clearFilters,
  resetFiltersChanged,
  setHasSearched,
} = toursSlice.actions;

export default toursSlice.reducer;
