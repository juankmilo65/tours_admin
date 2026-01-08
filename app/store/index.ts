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
import uiReducer from '~/store/slices/uiSlice';
/* import authReducer from '~/store/slices/authSlice';
import toursReducer from '~/store/slices/toursSlice';
import usersReducer from '~/store/slices/usersSlice';
import reservationsReducer from '~/store/slices/reservationsSlice';
import newsReducer from '~/store/slices/newsSlice';
import offersReducer from '~/store/slices/offersSlice'; */

// Redux Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['country'], // Only persist countries (transversal data)
};

const rootReducer = combineReducers({
  city: citiesReducer,
  country: countriesReducer,
  category: categoriesReducer,
  ui: uiReducer,
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
