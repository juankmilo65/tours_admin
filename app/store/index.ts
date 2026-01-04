/**
 * Redux Store Configuration
 * Centralized state management for Tours Admin
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import citiesReducer from '~/store/slices/citiesSlice';
/* import authReducer from '~/store/slices/authSlice';
import toursReducer from '~/store/slices/toursSlice';
import usersReducer from '~/store/slices/usersSlice';
import reservationsReducer from '~/store/slices/reservationsSlice';
import categoriesReducer from '~/store/slices/categoriesSlice';
import newsReducer from '~/store/slices/newsSlice';
import offersReducer from '~/store/slices/offersSlice';
import uiReducer from '~/store/slices/uiSlice'; */

const rootReducer = combineReducers({
  city: citiesReducer,
  /* offers: offersReducer,
  ui: uiReducer, */
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