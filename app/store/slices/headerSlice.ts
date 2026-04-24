/**
 * Header Slice
 * Stores the display data shown in the top navigation bar (name, initials, avatar).
 * Updated in real-time whenever the profile is loaded, edited or avatar changes —
 * independent of the login/logout cycle.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { logout, setAuthenticatedFromServer } from './authSlice';
import type { RootState } from '~/store';

export interface HeaderUserState {
  firstName: string;
  lastName: string;
  /**
   * undefined = not yet synced from profile page (Header falls back to authSlice).
   * null      = profile was loaded and user has no avatar.
   * string    = avatar URL.
   */
  avatarUrl: string | null | undefined;
}

const initialState: HeaderUserState = {
  firstName: '',
  lastName: '',
  avatarUrl: undefined,
};

const headerSlice = createSlice({
  name: 'header',
  initialState,
  reducers: {
    /**
     * Called whenever a full profile object is available (initial load, save success).
     */
    setHeaderUser: (
      state,
      action: PayloadAction<{ firstName: string; lastName: string; avatarUrl?: string | null }>
    ) => {
      state.firstName = action.payload.firstName;
      state.lastName = action.payload.lastName;
      state.avatarUrl = action.payload.avatarUrl ?? null;
    },

    setHeaderAvatar: (state, action: PayloadAction<string | null>) => {
      state.avatarUrl = action.payload;
    },

    clearHeaderUser: (state) => {
      state.firstName = '';
      state.lastName = '';
      state.avatarUrl = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, (state) => {
      state.firstName = '';
      state.lastName = '';
      state.avatarUrl = undefined;
    });

    builder.addCase(setAuthenticatedFromServer, (state, action) => {
      if (!action.payload.isAuthenticated) {
        state.firstName = '';
        state.lastName = '';
        state.avatarUrl = undefined;
      }
    });
  },
});

export const { setHeaderUser, setHeaderAvatar, clearHeaderUser } = headerSlice.actions;

// Selectors
export const selectHeaderUser = (state: RootState): HeaderUserState => state.header;

export default headerSlice.reducer;
