/**
 * useDropdownCache
 *
 * Cache-first hook for static booking form dropdowns:
 *   • Nationalities (countries with nationality labels) — keyed by UI language
 *   • Identification types per country code
 *
 * Strategy:
 *   1. On first call check Redux cache (persisted in localStorage via redux-persist).
 *   2. If the entry exists and is younger than TTL → use it, 0 network requests.
 *   3. If stale / missing → fetch once, store in cache with timestamp.
 *
 * NOTE: "nationalities" are CountryDropdown items from the countries API used
 *       exclusively for the nationality selector in booking forms.
 *       They are NOT the countries management list (countriesSlice).
 */

import { useRef, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import type { RootState } from '~/store/index';
import {
  setNationalities,
  setIdentificationTypesByNationality,
  setUsers,
  clearIdentificationTypesForCountry,
  isCacheValid,
  NATIONALITIES_TTL,
  ID_TYPES_TTL,
  USERS_TTL,
} from '~/store/slices/cacheSlice';
import { getCountriesDropdownBusiness } from '~/server/businessLogic/countriesBusinessLogic';
import { getIdentificationTypesDropdownBusiness } from '~/server/businessLogic/identificationTypesBusinessLogic';
import { getUsersDropdownBusiness } from '~/server/businessLogic/usersBusinessLogic';
import type { CountryDropdown } from '~/types/country';
import type { IdentificationTypeDropdown } from '~/types/identificationType';
import type { UserDropdownOption } from '~/store/slices/cacheSlice';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseDropdownCacheReturn {
  /**
   * Load (or reuse from cache) the nationality dropdown for the given language.
   * Dispatches to Redux on a cache miss; returns the list once ready.
   */
  loadNationalities: (language: string) => Promise<CountryDropdown[]>;

  /**
   * Load (or reuse from cache) identification types for a given country code.
   * Dispatches to Redux on a cache miss; returns the list once ready.
   * Pass forceRefresh=true to bypass cache and fetch fresh data from the API.
   */
  loadIdentificationTypes: (
    countryCode: string,
    language: string,
    forceRefresh?: boolean
  ) => Promise<IdentificationTypeDropdown[]>;

  /**
   * Invalidate cached identification types for a given country code.
   * Use before loadIdentificationTypes(code, lang, true) to ensure fresh data.
   */
  invalidateIdentificationTypes: (countryCode: string) => void;

  /**
   * Load (or reuse from cache) users dropdown for admin filters.
   * Dispatches to Redux on a cache miss; returns the list once ready.
   */
  loadUsers: (
    roles: string[] | null,
    isActive: string | null,
    token: string | undefined,
    language: string
  ) => Promise<UserDropdownOption[]>;
}

/**
 * Returns imperative loaders that write results into the Redux cache.
 * Pair with `useCachedNationalities` / `useAllCachedIdentificationTypes` selectors
 * in your component to reactively consume the cached data.
 */
export function useDropdownCache(): UseDropdownCacheReturn {
  const dispatch = useAppDispatch();

  // Capture the latest state in refs so the async callbacks always see the
  // most-recent cache without needing the state objects as dependencies
  // (which would recreate the callbacks on every state change).
  // Refs are initialized with the current Redux state and kept in sync via effects.
  const natRef = useRef<Record<string, CountryDropdown[]>>({});
  const natTsRef = useRef<Record<string, number>>({});
  const idRef = useRef<Record<string, IdentificationTypeDropdown[]>>({});
  const idTsRef = useRef<Record<string, number>>({});
  const usersRef = useRef<Record<string, UserDropdownOption[]>>({});
  const usersTsRef = useRef<Record<string, number>>({});

  // Keep refs in sync after each render — safe, no side effects during render
  const natState = useAppSelector((state: RootState) => state.cache.nationalities);
  const natTsState = useAppSelector((state: RootState) => state.cache.nationalitiesTimestamp);
  const idState = useAppSelector(
    (state: RootState) => state.cache.identificationTypesByNationality
  );
  const idTsState = useAppSelector(
    (state: RootState) => state.cache.identificationTypesByNationalityTimestamp
  );
  const usersState = useAppSelector((state: RootState) => state.cache.users);
  const usersTsState = useAppSelector((state: RootState) => state.cache.usersTimestamp);

  useEffect(() => {
    natRef.current = natState;
  }, [natState]);
  useEffect(() => {
    natTsRef.current = natTsState;
  }, [natTsState]);
  useEffect(() => {
    idRef.current = idState;
  }, [idState]);
  useEffect(() => {
    idTsRef.current = idTsState;
  }, [idTsState]);
  useEffect(() => {
    usersRef.current = usersState;
  }, [usersState]);
  useEffect(() => {
    usersTsRef.current = usersTsState;
  }, [usersTsState]);

  // ── Load nationalities ─────────────────────────────────────────────────────

  const loadNationalities = useCallback(
    async (language: string): Promise<CountryDropdown[]> => {
      const cached = natRef.current[language];
      const ts = natTsRef.current[language];

      if (cached !== undefined && isCacheValid(ts, NATIONALITIES_TTL)) {
        return cached;
      }

      const res = (await getCountriesDropdownBusiness(language)) as {
        success?: boolean;
        data?: CountryDropdown[];
      };

      if (res.success === true && res.data !== undefined) {
        dispatch(setNationalities({ language, data: res.data }));
        return res.data;
      }

      return cached ?? [];
    },
    [dispatch]
  );

  // ── Load identification types ──────────────────────────────────────────────

  const loadIdentificationTypes = useCallback(
    async (
      countryCode: string,
      language: string,
      forceRefresh = false
    ): Promise<IdentificationTypeDropdown[]> => {
      if (!countryCode) return [];

      const cached = idRef.current[countryCode];
      const ts = idTsRef.current[countryCode];

      if (!forceRefresh && cached !== undefined && isCacheValid(ts, ID_TYPES_TTL)) {
        return cached;
      }

      const res = (await getIdentificationTypesDropdownBusiness(countryCode, true, language)) as {
        success?: boolean;
        data?: IdentificationTypeDropdown[];
      };

      if (res.success === true && res.data !== undefined) {
        dispatch(setIdentificationTypesByNationality({ countryCode, data: res.data }));
        return res.data;
      }

      return cached ?? [];
    },
    [dispatch]
  );

  // ── Invalidate identification types for a country ──────────────────────────

  const invalidateIdentificationTypes = useCallback(
    (countryCode: string): void => {
      dispatch(clearIdentificationTypesForCountry(countryCode));
    },
    [dispatch]
  );

  // ── Load users ─────────────────────────────────────────────────────────────

  const loadUsers = useCallback(
    async (
      roles: string[] | null,
      isActive: string | null,
      token: string | undefined,
      language: string
    ): Promise<UserDropdownOption[]> => {
      if (token === undefined || token === '') return [];

      // Create cache key from token
      const cacheKey = token;

      const cached = usersRef.current[cacheKey];
      const ts = usersTsRef.current[cacheKey];

      if (cached !== undefined && isCacheValid(ts, USERS_TTL)) {
        return cached;
      }

      const res = await getUsersDropdownBusiness(roles, isActive, token, language);

      if (res.success === true && res.data !== undefined) {
        // Transform the data to match UserDropdownOption interface
        const transformedData: UserDropdownOption[] = res.data.map((user) => ({
          id: user.id,
          name: user.firstName,
          email: user.email,
        }));

        dispatch(setUsers({ token: cacheKey, data: transformedData }));
        return transformedData;
      }

      return cached ?? [];
    },
    [dispatch]
  );

  return { loadNationalities, loadIdentificationTypes, invalidateIdentificationTypes, loadUsers };
}

// ── Selector hooks (reactive reads inside components) ────────────────────────

/**
 * Reactive selector — returns nationality list from cache (re-renders on change).
 * Call `loadNationalities(language)` first to populate the cache.
 */
export function useCachedNationalities(language: string): CountryDropdown[] {
  return useAppSelector((state: RootState) => state.cache.nationalities[language]) ?? [];
}

/**
 * Reactive selector — returns ALL cached identification-type maps.
 * Index by `clientNationalities[index]` to get per-client options without
 * calling hooks inside a loop.
 */
export function useAllCachedIdentificationTypes(): Record<string, IdentificationTypeDropdown[]> {
  return useAppSelector((state: RootState) => state.cache.identificationTypesByNationality);
}

/**
 * Reactive selector — returns id types for a single country code.
 * Use when only one country is relevant at a time.
 */
export function useCachedIdentificationTypes(countryCode: string): IdentificationTypeDropdown[] {
  return (
    useAppSelector(
      (state: RootState) => state.cache.identificationTypesByNationality[countryCode]
    ) ?? []
  );
}
