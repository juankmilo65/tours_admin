/**
 * Auth Slice
 * Manages user authentication state and token
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '~/store';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'user';
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Try to load initial state from localStorage (client-side only)
const getInitialState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };
  }

  try {
    const token = window.localStorage.getItem('authToken');
    const userStr = window.localStorage.getItem('authUser');
    const user = userStr !== null ? (JSON.parse(userStr) as User) : null;

    return {
      user,
      token,
      isAuthenticated: token !== null && user !== null,
      isLoading: false,
      error: null,
    };
  } catch {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };
  }
};

const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('authToken', action.payload.token);
        window.localStorage.setItem('authUser', JSON.stringify(action.payload.user));
      }
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload;

      // Clear localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('authToken');
        window.localStorage.removeItem('authUser');
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;

      // Clear localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('authToken');
        window.localStorage.removeItem('authUser');
      }
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;

      // Update localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('authUser', JSON.stringify(action.payload));
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser, clearError } =
  authSlice.actions;

// Selectors
export const selectAuth = (state: RootState): AuthState => state.auth;
export const selectCurrentUser = (state: RootState): User | null => state.auth.user;
export const selectAuthToken = (state: RootState): string | null => state.auth.token;
export const selectIsAuthenticated = (state: RootState): boolean => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState): boolean => state.auth.isLoading;
export const selectAuthError = (state: RootState): string | null => state.auth.error;

export default authSlice.reducer;
