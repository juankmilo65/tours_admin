/**
 * Identification Types Business Logic - Business layer for Identification Types Management
 */

import type { IdentificationTypeDropdown } from '~/types/identificationType';
import { getIdentificationTypesDropdown } from '../identificationTypes';

export type { IdentificationTypeDropdown };

export interface IdentificationTypeDropdownResponse {
  success: boolean;
  data?: IdentificationTypeDropdown[];
  error?: unknown;
  message?: string;
}

/**
 * Get identification types for dropdown
 */
export const getIdentificationTypesDropdownBusiness = async (
  countryCode: string | null = null,
  active = true,
  language = 'es'
): Promise<IdentificationTypeDropdownResponse> => {
  try {
    const result = (await getIdentificationTypesDropdown(countryCode, active, language)) as {
      success?: boolean;
      data?: IdentificationTypeDropdown[];
      error?: { message?: string; status?: number };
    };

    if (result.success === true && result.data !== undefined) {
      return result as IdentificationTypeDropdownResponse;
    }

    // Extract server error message if present
    const serverMessage = result.error?.message ?? undefined;

    return {
      success: false,
      data: [],
      message: serverMessage,
    };
  } catch (error) {
    console.error('Error in getIdentificationTypesDropdownBusiness:', error);
    const errMessage = error instanceof Error ? error.message : undefined;
    return {
      success: false,
      data: [],
      message: errMessage,
    };
  }
};
