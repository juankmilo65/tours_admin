/**
 * Financial Configs Service - API Integration for Financial Configuration Management
 */

import { createServiceREST } from './_index';
import type {
  CreateFinancialConfigDto,
  UpdateFinancialConfigDto,
} from '../types/FinancialConfigProps';

// Type declaration for Vite environment variables
interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

/**
 * Get all financial configs
 */
export const getFinancialConfigs = async (token?: string): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for financial configs');
    return { success: false, data: [] };
  }

  try {
    const endpoint = 'financial-configs';
    const service = createServiceREST(BASE_URL, endpoint, token ?? '');

    const result = await service.get();
    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getFinancialConfigs service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getFinancialConfigs service:', error);
    }
    return { error, success: false, data: [] };
  }
};

/**
 * Get financial config by country code
 */
export const getFinancialConfigByCountry = async (
  countryCode: string,
  token: string
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, data: null };
  }

  try {
    const endpoint = `financial-configs/${countryCode}`;
    const service = createServiceREST(BASE_URL, endpoint, token);

    const result = await service.get();
    return result;
  } catch (error) {
    console.error('Error in getFinancialConfigByCountry service:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Create new financial config
 */
export const createFinancialConfig = async (
  data: CreateFinancialConfigDto,
  token: string
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const endpoint = 'financial-configs';
  const service = createServiceREST(BASE_URL, endpoint, token);

  const result = await service.create(data);
  return result;
};

/**
 * Update financial config by country code
 */
export const updateFinancialConfig = async (
  countryCode: string,
  data: UpdateFinancialConfigDto,
  token: string
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const service = createServiceREST(BASE_URL, 'financial-configs', token);

  const result = await service.put(data, {
    url: `/financial-configs/${countryCode}`,
  });
  return result;
};
