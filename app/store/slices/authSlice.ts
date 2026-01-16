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
  requiresOtp: boolean;
  otpSent: boolean;
  pendingEmail: string | null;
  // Store login credentials temporarily before OTP verification
  pendingToken: string | null;
  pendingUser: User | null;
}

// Initial state - always start as not authenticated
// Authentication state will be synced from server loader
const getInitialState = (): AuthState => {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    requiresOtp: false,
    otpSent: false,
    pendingEmail: null,
    pendingToken: null,
    pendingUser: null,
  };
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
      // Store credentials temporarily, but DON'T mark as authenticated yet
      // User must verify OTP first
      state.pendingUser = action.payload.user;
      state.pendingToken = action.payload.token;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.requiresOtp = true;

      // DON'T persist to localStorage yet
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
      state.pendingUser = null;
      state.pendingToken = null;
      state.requiresOtp = false;
      state.otpSent = false;
      state.pendingEmail = null;
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
    setAuthenticatedFromServer: (
      state,
      action: PayloadAction<{ isAuthenticated: boolean; authToken: string | null }>
    ) => {
      const { isAuthenticated, authToken } = action.payload;
      console.log(
        'authSlice.setAuthenticatedFromServer - isAuthenticated from server:',
        isAuthenticated
      );
      console.log('authSlice.setAuthenticatedFromServer - authToken from server:', authToken);
      console.log('authSlice.setAuthenticatedFromServer - current token:', state.token);
      console.log(
        'authSlice.setAuthenticatedFromServer - current isAuthenticated:',
        state.isAuthenticated
      );

      // Only update authentication state if server says not authenticated
      // If server says authenticated, we keep current state (from login)
      if (!isAuthenticated) {
        console.log(
          'authSlice.setAuthenticatedFromServer - Server says NOT authenticated, clearing state'
        );
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.requiresOtp = false;
        state.otpSent = false;
        state.pendingEmail = null;

        // Clear localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('authToken');
          window.localStorage.removeItem('authUser');
        }
      } else {
        // Server says authenticated - use token from server if available
        // Otherwise try to restore from localStorage
        console.log('authSlice.setAuthenticatedFromServer - Server says authenticated');
        if (authToken !== null && authToken.trim() !== '') {
          console.log('authSlice.setAuthenticatedFromServer - Using token from server session');
          state.token = authToken;
          state.isAuthenticated = true;

          // Save to localStorage
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('authToken', authToken);
            console.log('authSlice.setAuthenticatedFromServer - Saved token to localStorage');
          }
        } else if (state.token === null && typeof window !== 'undefined') {
          const storedToken = window.localStorage.getItem('authToken');
          const storedUser = window.localStorage.getItem('authUser');
          console.log(
            'authSlice.setAuthenticatedFromServer - Token from localStorage:',
            storedToken
          );
          console.log('authSlice.setAuthenticatedFromServer - User from localStorage:', storedUser);

          if (storedToken !== null) {
            state.token = storedToken;
            state.isAuthenticated = true;
            console.log(
              'authSlice.setAuthenticatedFromServer - Restored token from localStorage:',
              storedToken
            );
          }

          if (storedUser !== null) {
            try {
              state.user = JSON.parse(storedUser) as User;
              console.log('authSlice.setAuthenticatedFromServer - Restored user from localStorage');
            } catch (error) {
              console.error(
                'authSlice.setAuthenticatedFromServer - Error parsing user from localStorage:',
                error
              );
            }
          }
        } else {
          console.log('authSlice.setAuthenticatedFromServer - Keeping current Redux state');
        }
      }
    },
    requestOtpStart: (state, action: PayloadAction<string>) => {
      state.isLoading = true;
      state.error = null;
      state.pendingEmail = action.payload;
    },
    requestOtpSuccess: (state) => {
      state.isLoading = false;
      state.otpSent = true;
      state.requiresOtp = true;
      state.error = null;
    },
    requestOtpFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.otpSent = false;
    },
    verifyOtpStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    verifyOtpSuccess: (state) => {
      // Now user is fully authenticated after OTP verification
      state.user = state.pendingUser;
      state.token = state.pendingToken;
      state.pendingUser = null;
      state.pendingToken = null;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.requiresOtp = false;
      state.otpSent = false;
      state.error = null;

      // Persist to localStorage now that OTP is verified
      if (typeof window !== 'undefined' && state.token !== null && state.user !== null) {
        window.localStorage.setItem('authToken', state.token);
        window.localStorage.setItem('authUser', JSON.stringify(state.user));
      }
    },
    verifyOtpFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    clearOtpState: (state) => {
      state.requiresOtp = false;
      state.otpSent = false;
      state.pendingEmail = null;
      state.pendingUser = null;
      state.pendingToken = null;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
  setAuthenticatedFromServer,
  requestOtpStart,
  requestOtpSuccess,
  requestOtpFailure,
  verifyOtpStart,
  verifyOtpSuccess,
  verifyOtpFailure,
  clearOtpState,
} = authSlice.actions;

// Selectors
export const selectAuth = (state: RootState): AuthState => state.auth;
export const selectCurrentUser = (state: RootState): User | null => state.auth.user;
export const selectAuthToken = (state: RootState): string | null => state.auth.token;
export const selectPendingToken = (state: RootState): string | null => state.auth.pendingToken;
export const selectIsAuthenticated = (state: RootState): boolean => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState): boolean => state.auth.isLoading;
export const selectAuthError = (state: RootState): string | null => state.auth.error;
export const selectRequiresOtp = (state: RootState): boolean => state.auth.requiresOtp;
export const selectOtpSent = (state: RootState): boolean => state.auth.otpSent;
export const selectPendingEmail = (state: RootState): string | null => state.auth.pendingEmail;

export default authSlice.reducer;
