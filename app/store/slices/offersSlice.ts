/**
 * Offers Slice
 * Manages offers state
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface Offer {
  id: string;
  title: string;
  description: string;
  discountPercentage: number;
  tourIds: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface OffersState {
  offers: Offer[];
  selectedOffer: Offer | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: OffersState = {
  offers: [],
  selectedOffer: null,
  isLoading: false,
  error: null,
};

const offersSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {
    fetchOffersStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchOffersSuccess: (state, action: PayloadAction<Offer[]>) => {
      state.offers = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchOffersFailure: (state, action: PayloadAction<string>) => {
      state.offers = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    addOffer: (state, action: PayloadAction<Offer>) => {
      state.offers.push(action.payload);
    },
    updateOffer: (state, action: PayloadAction<Offer>) => {
      const index = state.offers.findIndex((o) => o.id === action.payload.id);
      if (index !== -1) {
        state.offers[index] = action.payload;
      }
    },
    deleteOffer: (state, action: PayloadAction<string>) => {
      state.offers = state.offers.filter((o) => o.id !== action.payload);
    },
    setSelectedOffer: (state, action: PayloadAction<Offer | null>) => {
      state.selectedOffer = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchOffersStart,
  fetchOffersSuccess,
  fetchOffersFailure,
  addOffer,
  updateOffer,
  deleteOffer,
  setSelectedOffer,
  clearError,
} = offersSlice.actions;
export default offersSlice.reducer;
