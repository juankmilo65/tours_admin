/**
 * KYC Business Logic - Business layer for KYC
 * Follows exact pattern from bookingsBusinessLogic.tsx
 */

import { getKycStatus, initKyc, getKycDashboardUrl } from '../kyc';
import type { KycStatus } from '~/types/kyc';

export interface KycStatusResponse {
  success: boolean;
  data?: KycStatus;
  error?: string;
}

export interface KycInitResponse {
  success: boolean;
  onboardingUrl?: string;
  error?: string;
}

/**
 * Get KYC status for current owner
 */
export const getKycStatusBusiness = async (
  token: string | undefined,
  language = 'es'
): Promise<KycStatusResponse> => {
  try {
    const result = (await getKycStatus(token ?? '', language)) as {
      success?: boolean;
      data?: KycStatus;
      error?: unknown;
    };

    if (result.success === true && result.data !== undefined) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      error: language === 'en' ? 'Could not fetch KYC status' : 'No se pudo obtener estado KYC',
    };
  } catch (error) {
    console.error('Error in getKycStatusBusiness:', error);
    return {
      success: false,
      error: language === 'en' ? 'Error loading KYC status' : 'Error al cargar estado KYC',
    };
  }
};

/**
 * Initialize KYC flow
 */
export const initKycBusiness = async (
  token: string | undefined,
  language = 'es'
): Promise<KycInitResponse> => {
  try {
    const result = (await initKyc(token ?? '', language)) as {
      success?: boolean;
      data?: { onboardingUrl?: string };
      error?: {
        message?: string;
        response?: { data?: { error?: string } };
      };
    };

    if (result.success === true && result.data?.onboardingUrl !== undefined) {
      return { success: true, onboardingUrl: result.data.onboardingUrl };
    }

    let errorMessage = language === 'en' ? 'Could not initialize KYC' : 'No se pudo iniciar KYC';
    if (
      result.error?.response?.data?.error !== null &&
      result.error?.response?.data?.error !== undefined &&
      result.error.response.data.error !== ''
    ) {
      errorMessage = result.error.response.data.error;
    } else if (
      result.error?.message !== null &&
      result.error?.message !== undefined &&
      result.error.message !== ''
    ) {
      errorMessage = result.error.message;
    }

    return { success: false, error: errorMessage };
  } catch (error) {
    console.error('Error in initKycBusiness:', error);
    return {
      success: false,
      error: language === 'en' ? 'Error initializing KYC' : 'Error al iniciar KYC',
    };
  }
};

/**
 * Get KYC dashboard URL for owner to view/update KYC info
 */
export const getKycDashboardUrlBusiness = async (
  token: string | undefined,
  language = 'es'
): Promise<KycInitResponse> => {
  try {
    const result = (await getKycDashboardUrl(token ?? '', language)) as {
      success?: boolean;
      data?: { onboardingUrl?: string };
      error?: { message?: string };
    };

    if (result.success === true && result.data?.onboardingUrl !== undefined) {
      return { success: true, onboardingUrl: result.data.onboardingUrl };
    }

    return {
      success: false,
      error:
        language === 'en'
          ? 'Could not get KYC dashboard URL'
          : 'No se pudo obtener URL dashboard KYC',
    };
  } catch (error) {
    console.error('Error in getKycDashboardUrlBusiness:', error);
    return {
      success: false,
      error: language === 'en' ? 'Error loading KYC dashboard' : 'Error al cargar dashboard KYC',
    };
  }
};
