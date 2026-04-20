/**
 * Redux Store Configuration
 * Centralized state management for Tours Admin
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from './storage';
import citiesReducer from '~/store/slices/citiesSlice';
import countriesReducer from '~/store/slices/countriesSlice';
import categoriesReducer from '~/store/slices/categoriesSlice';
import languagesReducer from '~/store/slices/languagesSlice';
import uiReducer from '~/store/slices/uiSlice';
import authReducer from '~/store/slices/authSlice';
import cacheReducer from '~/store/slices/cacheSlice';
import bookingsReducer from '~/store/slices/bookingsSlice';
import toursReducer from '~/store/slices/toursSlice';
import paymentsReducer from '~/store/slices/paymentsSlice';
import kycReducer from '~/store/slices/kycSlice';
import cancellationPoliciesReducer from '~/store/slices/cancellationPoliciesSlice';
import stripePaymentsReducer from '~/store/slices/stripePaymentsSlice';

// Redux Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['country', 'auth', 'cache'], // Persist countries, auth and dropdown cache
};

const rootReducer = combineReducers({
  city: citiesReducer,
  country: countriesReducer,
  category: categoriesReducer,
  languages: languagesReducer,
  ui: uiReducer,
  auth: authReducer,
  cache: cacheReducer,
  bookings: bookingsReducer,
  tours: toursReducer,
  payments: paymentsReducer,
  kyc: kycReducer,
  cancellationPolicies: cancellationPoliciesReducer,
  stripePayments: stripePaymentsReducer,
  /* offers: offersReducer, */
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
        immutableCheck: false,
      }),
  });

  return store;
};

// Export makeStore - primarily used for type definition
export { makeStore };

export const makePersistor = (
  store: ReturnType<typeof makeStore>
): ReturnType<typeof persistStore> => {
  return persistStore(store);
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
