/**
 * useCurrencyConfig
 * Loads the backend currency config (GET /api/config/currencies) into Redux once
 * and exposes it. Fetches lazily on first use; cached in Redux for the session.
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken } from '~/store/slices/authSlice';
import {
  fetchCurrencyConfigStart,
  fetchCurrencyConfigSuccess,
  fetchCurrencyConfigFailure,
  selectCurrencies,
  selectCurrencyConfigLoaded,
  selectCurrencyConfigLoading,
} from '~/store/slices/currencyConfigSlice';
import { getCurrenciesConfigBusiness } from '~/server/businessLogic/currencyConfigBusinessLogic';
import { useTranslation } from '~/lib/i18n/utils';
import type { CurrencyConfig } from '~/types/currencyConfig';

export function useCurrencyConfig(): {
  currencies: CurrencyConfig[];
  loaded: boolean;
  loading: boolean;
} {
  const dispatch = useAppDispatch();
  const currencies = useAppSelector(selectCurrencies);
  const loaded = useAppSelector(selectCurrencyConfigLoaded);
  const loading = useAppSelector(selectCurrencyConfigLoading);
  const token = useAppSelector(selectAuthToken);
  const { language } = useTranslation();

  useEffect(() => {
    if (loaded || loading) return undefined;
    let cancelled = false;
    dispatch(fetchCurrencyConfigStart());
    void getCurrenciesConfigBusiness(token ?? undefined, language).then((res) => {
      if (cancelled) return;
      if (res.success && res.data !== undefined) {
        dispatch(fetchCurrencyConfigSuccess(res.data));
      } else {
        dispatch(fetchCurrencyConfigFailure(res.error ?? 'Failed to load currencies config'));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, loading, token, language, dispatch]);

  return { currencies, loaded, loading };
}
