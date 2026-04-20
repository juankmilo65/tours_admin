/**
 * Financial Configs Business Logic - Business Logic Layer for Financial Configuration Management
 */

import {
  getFinancialConfigs,
  getFinancialConfigByCountry,
  createFinancialConfig,
  updateFinancialConfig,
} from '../financialConfigs';
import type {
  FinancialConfig,
  FinancialConfigResponse,
  FinancialConfigsResponse,
  CreateFinancialConfigDto,
  UpdateFinancialConfigDto,
} from '~/types/FinancialConfigProps';

// Re-export types for components to use
export type {
  FinancialConfig,
  FinancialConfigResponse,
  FinancialConfigsResponse,
  CreateFinancialConfigDto,
  UpdateFinancialConfigDto,
};

/**
 * Get all financial configs - for use in components
 */
export const getFinancialConfigsBusiness = async (params: {
  token?: string;
}): Promise<FinancialConfigsResponse> => {
  try {
    const result = (await getFinancialConfigs(params.token)) as FinancialConfigsResponse;
    if (result.data !== undefined && Array.isArray(result.data)) {
      return {
        ...result,
        data: result.data,
      };
    }
    return result;
  } catch (error) {
    console.error('Error in getFinancialConfigsBusiness:', error);
    return { success: false, data: [] };
  }
};

/**
 * Get financial config by country code - for use in components
 */
export const getFinancialConfigByCountryBusiness = async (
  countryCode: string,
  token: string
): Promise<FinancialConfigResponse> => {
  try {
    const result = (await getFinancialConfigByCountry(
      countryCode,
      token
    )) as FinancialConfigResponse;
    return result;
  } catch (error) {
    console.error('Error in getFinancialConfigByCountryBusiness:', error);
    return { success: false };
  }
};

/**
 * Create financial config - for use in components
 */
export const createFinancialConfigBusiness = async (
  data: CreateFinancialConfigDto,
  token: string
): Promise<FinancialConfigResponse> => {
  try {
    const result = (await createFinancialConfig(data, token)) as FinancialConfigResponse;
    return result;
  } catch (error) {
    console.error('Error in createFinancialConfigBusiness:', error);
    return { success: false };
  }
};

/**
 * Update financial config - for use in components
 */
export const updateFinancialConfigBusiness = async (
  countryCode: string,
  data: UpdateFinancialConfigDto,
  token: string
): Promise<FinancialConfigResponse> => {
  try {
    const result = (await updateFinancialConfig(
      countryCode,
      data,
      token
    )) as FinancialConfigResponse;
    return result;
  } catch (error) {
    console.error('Error in updateFinancialConfigBusiness:', error);
    return { success: false };
  }
};
