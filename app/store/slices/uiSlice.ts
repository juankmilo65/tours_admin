/**
 * UI Slice
 * Manages UI state (modals, notifications, global loading, auth token, etc.)
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '~/store';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface Modal {
  id: string;
  type: 'create' | 'edit' | 'delete' | 'confirm';
  title: string;
  isOpen: boolean;
  data?: unknown;
}

interface UIState {
  sidebarCollapsed: boolean;
  notifications: Notification[];
  modals: Modal[];
  isLoading: boolean;
  // Global transversal state
  isGlobalLoading: boolean;
  globalLoadingMessage: string;
  token: string | null;
  language: string;
  currency: string;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  notifications: [],
  modals: [],
  isLoading: false,
  // Global transversal state
  isGlobalLoading: false,
  globalLoadingMessage: '',
  token: null,
  language: 'es',
  currency: 'MXN',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    openModal: (state, action: PayloadAction<Modal>) => {
      state.modals.push(action.payload);
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter((m) => m.id !== action.payload);
    },
    closeAllModals: (state) => {
      state.modals = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    // Global transversal actions
    setGlobalLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isGlobalLoading = action.payload.isLoading;
      state.globalLoadingMessage = action.payload.message ?? '';
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  setLoading,
  setGlobalLoading,
  setToken,
  setLanguage,
  setCurrency,
} = uiSlice.actions;

// Selectors
export const selectIsGlobalLoading = (state: RootState): boolean => state.ui.isGlobalLoading;
export const selectGlobalLoadingMessage = (state: RootState): string =>
  state.ui.globalLoadingMessage;
export const selectToken = (state: RootState): string | null => state.ui.token;
export const selectLanguage = (state: RootState): string => state.ui.language;
export const selectCurrency = (state: RootState): string => state.ui.currency;
export const selectSidebarCollapsed = (state: RootState): boolean => state.ui.sidebarCollapsed;
export const selectModals = (state: RootState): Modal[] => state.ui.modals;

export default uiSlice.reducer;
