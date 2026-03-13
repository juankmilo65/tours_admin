/**
 * Cache Slice
 * Manages in-memory cache for dropdown data (languages, activities, users, etc.)
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { CountryDropdown } from '~/types/country';
import type { IdentificationTypeDropdown } from '~/types/identificationType';

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

/** TTL for static reference data — 24 h */
export const NATIONALITIES_TTL = 24 * 60 * 60 * 1000;
/** TTL for identification types per country — 24 h */
export const ID_TYPES_TTL = 24 * 60 * 60 * 1000;

interface CacheState {
  // Dropdown data by language code
  languages: Record<string, LanguageOption[]>;
  activities: Record<string, ActivityDropdownOption[]>;
  users: Record<string, UserDropdownOption[]>; // key: authToken

  // Nationality dropdown — keyed by language ('es' | 'en')
  // NOTE: these are CountryDropdown items used for the nationality selector
  //       in booking forms. NOT the countries management list.
  nationalities: Record<string, CountryDropdown[]>;
  nationalitiesTimestamp: Record<string, number>;

  // Identification types per nationality code — keyed by countryCode (e.g. 'AR')
  identificationTypesByNationality: Record<string, IdentificationTypeDropdown[]>;
  identificationTypesByNationalityTimestamp: Record<string, number>;

  // Timestamps for cache invalidation
  languagesTimestamp: Record<string, number>;
  activitiesTimestamp: Record<string, number>;
  usersTimestamp: Record<string, number>;
}

const initialState: CacheState = {
  languages: {},
  activities: {},
  users: {},
  nationalities: {},
  nationalitiesTimestamp: {},
  identificationTypesByNationality: {},
  identificationTypesByNationalityTimestamp: {},
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
    /** Store the nationality dropdown for a given UI language */
    setNationalities: (
      state,
      action: PayloadAction<{ language: string; data: CountryDropdown[] }>
    ) => {
      const { language, data } = action.payload;
      state.nationalities[language] = data;
      state.nationalitiesTimestamp[language] = Date.now();
    },
    /** Store identification types for a given nationality code */
    setIdentificationTypesByNationality: (
      state,
      action: PayloadAction<{ countryCode: string; data: IdentificationTypeDropdown[] }>
    ) => {
      const { countryCode, data } = action.payload;
      state.identificationTypesByNationality[countryCode] = data;
      state.identificationTypesByNationalityTimestamp[countryCode] = Date.now();
    },
    clearCache: (state) => {
      state.languages = {};
      state.activities = {};
      state.users = {};
      state.nationalities = {};
      state.nationalitiesTimestamp = {};
      state.identificationTypesByNationality = {};
      state.identificationTypesByNationalityTimestamp = {};
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
    clearNationalities: (state) => {
      state.nationalities = {};
      state.nationalitiesTimestamp = {};
    },
    clearIdentificationTypesByNationality: (state) => {
      state.identificationTypesByNationality = {};
      state.identificationTypesByNationalityTimestamp = {};
    },
  },
});

export const {
  setLanguages,
  setActivities,
  setUsers,
  setNationalities,
  setIdentificationTypesByNationality,
  clearCache,
  clearLanguages,
  clearActivities,
  clearUsers,
  clearNationalities,
  clearIdentificationTypesByNationality,
} = cacheSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

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

export const getCachedNationalities =
  (language: string) =>
  (state: { cache: CacheState }): CountryDropdown[] | undefined =>
    state.cache.nationalities[language];

export const getNationalitiesTimestamp =
  (language: string) =>
  (state: { cache: CacheState }): number | undefined =>
    state.cache.nationalitiesTimestamp[language];

export const getCachedIdentificationTypesByNationality =
  (countryCode: string) =>
  (state: { cache: CacheState }): IdentificationTypeDropdown[] | undefined =>
    state.cache.identificationTypesByNationality[countryCode];

export const getIdentificationTypesByNationalityTimestamp =
  (countryCode: string) =>
  (state: { cache: CacheState }): number | undefined =>
    state.cache.identificationTypesByNationalityTimestamp[countryCode];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const isCacheValid = (
  timestamp: number | undefined,
  maxAge: number = 5 * 60 * 1000
): boolean => {
  if (timestamp === undefined) return false;
  return Date.now() - timestamp < maxAge;
};

export default cacheSlice.reducer;
