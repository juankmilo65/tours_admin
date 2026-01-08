/**
 * Reservations Slice
 * Manages reservations state
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface Reservation {
  id: string;
  tourId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  bookingDate: string;
  tourDate: string;
  participants: number;
  createdAt: string;
  updatedAt: string;
}

interface ReservationsState {
  reservations: Reservation[];
  selectedReservation: Reservation | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ReservationsState = {
  reservations: [],
  selectedReservation: null,
  isLoading: false,
  error: null,
};

const reservationsSlice = createSlice({
  name: 'reservations',
  initialState,
  reducers: {
    fetchReservationsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchReservationsSuccess: (state, action: PayloadAction<Reservation[]>) => {
      state.reservations = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchReservationsFailure: (state, action: PayloadAction<string>) => {
      state.reservations = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    addReservation: (state, action: PayloadAction<Reservation>) => {
      state.reservations.push(action.payload);
    },
    updateReservation: (state, action: PayloadAction<Reservation>) => {
      const index = state.reservations.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.reservations[index] = action.payload;
      }
    },
    deleteReservation: (state, action: PayloadAction<string>) => {
      state.reservations = state.reservations.filter((r) => r.id !== action.payload);
    },
    setSelectedReservation: (state, action: PayloadAction<Reservation | null>) => {
      state.selectedReservation = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchReservationsStart,
  fetchReservationsSuccess,
  fetchReservationsFailure,
  addReservation,
  updateReservation,
  deleteReservation,
  setSelectedReservation,
  clearError,
} = reservationsSlice.actions;
export default reservationsSlice.reducer;
