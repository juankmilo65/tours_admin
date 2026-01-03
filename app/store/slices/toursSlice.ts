/**
 * Tours Slice
 * Manages tours state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Tour {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  capacity: number;
  categoryId: string;
  cityId: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ToursState {
  tours: Tour[];
  selectedTour: Tour | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ToursState = {
  tours: [],
  selectedTour: null,
  isLoading: false,
  error: null,
};

const toursSlice = createSlice({
  name: 'tours',
  initialState,
  reducers: {
    fetchToursStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchToursSuccess: (state, action: PayloadAction<Tour[]>) => {
      state.tours = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchToursFailure: (state, action: PayloadAction<string>) => {
      state.tours = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    addTour: (state, action: PayloadAction<Tour>) => {
      state.tours.push(action.payload);
    },
    updateTour: (state, action: PayloadAction<Tour>) => {
      const index = state.tours.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tours[index] = action.payload;
      }
    },
    deleteTour: (state, action: PayloadAction<string>) => {
      state.tours = state.tours.filter((t) => t.id !== action.payload);
    },
    setSelectedTour: (state, action: PayloadAction<Tour | null>) => {
      state.selectedTour = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchToursStart,
  fetchToursSuccess,
  fetchToursFailure,
  addTour,
  updateTour,
  deleteTour,
  setSelectedTour,
  clearError,
} = toursSlice.actions;
export default toursSlice.reducer;
