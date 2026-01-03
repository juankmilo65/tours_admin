/**
 * Redux Store Configuration
 * Centralized state management for Tours Admin
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import toursReducer from './slices/toursSlice';
import usersReducer from './slices/usersSlice';
import reservationsReducer from './slices/reservationsSlice';
import citiesReducer from './slices/citiesSlice';
import categoriesReducer from './slices/categoriesSlice';
import newsReducer from './slices/newsSlice';
import offersReducer from './slices/offersSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tours: toursReducer,
    users: usersReducer,
    reservations: reservationsReducer,
    cities: citiesReducer,
    categories: categoriesReducer,
    news: newsReducer,
    offers: offersReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
