/**
 * Cache Slice
 * Manages in-memory cache for dropdown data (languages, activities, users, etc.)
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

// Language dropdown option
export interface LanguageOption {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
}

// Activity dropdown option
export interface ActivityDropdownOption {
  id: string;
  activityEs: string;
  activityEn: string;
}

// User dropdown option
export interface UserDropdownOption {
  id: string;
  name: string;
  email: string;
}

interface CacheState {
  // Dropdown data by language code
  languages: Record<string, LanguageOption[]>;
  activities: Record<string, ActivityDropdownOption[]>;
  users: Record<string, UserDropdownOption[]>; // key: authToken

  // Timestamps for cache invalidation (optional)
  languagesTimestamp: Record<string, number>;
  activitiesTimestamp: Record<string, number>;
  usersTimestamp: Record<string, number>;
}

const initialState: CacheState = {
  languages: {},
  activities: {},
  users: {},
  languagesTimestamp: {},
  activitiesTimestamp: {},
  usersTimestamp: {},
};

const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    setLanguages: (state, action: PayloadAction<{ language: string; data: LanguageOption[] }>) => {
      const { language, data } = action.payload;
      state.languages[language] = data;
      state.languagesTimestamp[language] = Date.now();
    },
    setActivities: (
      state,
      action: PayloadAction<{ language: string; data: ActivityDropdownOption[] }>
    ) => {
      const { language, data } = action.payload;
      state.activities[language] = data;
      state.activitiesTimestamp[language] = Date.now();
    },
    setUsers: (state, action: PayloadAction<{ token: string; data: UserDropdownOption[] }>) => {
      const { token, data } = action.payload;
      state.users[token] = data;
      state.usersTimestamp[token] = Date.now();
    },
    clearCache: (state) => {
      state.languages = {};
      state.activities = {};
      state.users = {};
      state.languagesTimestamp = {};
      state.activitiesTimestamp = {};
      state.usersTimestamp = {};
    },
    clearLanguages: (state) => {
      state.languages = {};
      state.languagesTimestamp = {};
    },
    clearActivities: (state) => {
      state.activities = {};
      state.activitiesTimestamp = {};
    },
    clearUsers: (state) => {
      state.users = {};
      state.usersTimestamp = {};
    },
  },
});

export const {
  setLanguages,
  setActivities,
  setUsers,
  clearCache,
  clearLanguages,
  clearActivities,
  clearUsers,
} = cacheSlice.actions;

// Selectors
export const getCachedLanguages =
  (language: string) =>
  (state: { cache: CacheState }): LanguageOption[] | undefined =>
    state.cache.languages[language];

export const getCachedActivities =
  (language: string) =>
  (state: { cache: CacheState }): ActivityDropdownOption[] | undefined =>
    state.cache.activities[language];

export const getCachedUsers =
  (token: string) =>
  (state: { cache: CacheState }): UserDropdownOption[] | undefined =>
    state.cache.users[token];

// Helper to check if cache is valid (optional, for future use)
export const isCacheValid = (
  timestamp: number | undefined,
  maxAge: number = 5 * 60 * 1000 // 5 minutes default
): boolean => {
  if (timestamp === undefined) return false;
  return Date.now() - timestamp < maxAge;
};

export default cacheSlice.reducer;
