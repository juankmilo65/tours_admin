/**
 * Redux Store Configuration
 * Centralized state management for Tours Admin
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from '~/store/slices/authSlice';
import toursReducer from '~/store/slices/toursSlice';
import usersReducer from '~/store/slices/usersSlice';
import reservationsReducer from '~/store/slices/reservationsSlice';
import citiesReducer from '~/store/slices/citiesSlice';
import categoriesReducer from '~/store/slices/categoriesSlice';
import newsReducer from '~/store/slices/newsSlice';
import offersReducer from '~/store/slices/offersSlice';
import uiReducer from '~/store/slices/uiSlice';

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
