/**
 * Redux Store Configuration
 * Centralized state management for Tours Admin
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
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

const rootReducer = combineReducers({
  city: citiesReducer,
  country: countriesReducer,
  category: categoriesReducer,
  ui: uiReducer,
  /* offers: offersReducer, */
})

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
          serializableCheck: false,
          immutableCheck: false,
      }),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']