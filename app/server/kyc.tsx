/**
 * KYC Service - HTTP layer for KYC API
 * Follows exact pattern from bookings.tsx
 */

import { createServiceREST } from './_index';

interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}
interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

/**
 * Get KYC status for current owner
 */
export const getKycStatus = async (token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, data: null };
  }

  try {
    const kycEndpoint = 'kyc/status';
    const kycService = createServiceREST(BASE_URL, kycEndpoint, token);

    const result = await kycService.get({
      headers: { 'X-Language': language },
    });

    return result;
  } catch (error) {
    console.error('Error in getKycStatus:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Initialize KYC flow (returns Stripe Express dashboard URL)
 */
export const initKyc = async (
  token: string,
  language = 'es',
  country = 'MX',
  returnUrl?: string,
  refreshUrl?: string
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const kycEndpoint = 'kyc/initiate';
    const kycService = createServiceREST(BASE_URL, kycEndpoint, token);

    const body: Record<string, string> = { country };
    if (returnUrl !== undefined && returnUrl !== '') {
      body.return_url = returnUrl;
    }
    if (refreshUrl !== undefined && refreshUrl !== '') {
      body.refresh_url = refreshUrl;
    }

    // eslint-disable-next-line no-console
    console.log(
      `🔍 [KYC INITIATE] curl -X POST '${BASE_URL}/api/${kycEndpoint}' ` +
        `-H 'Authorization: Bearer ${token.substring(0, 20)}...' ` +
        `-H 'Content-Type: application/json' ` +
        `-H 'X-Language: ${language}' ` +
        `-d '${JSON.stringify(body)}'`
    );

    const result = await kycService.create(body, {
      headers: { 'X-Language': language },
    });

    // eslint-disable-next-line no-console
    console.log('🔍 [KYC INITIATE] Response:', JSON.stringify(result));

    return result;
  } catch (error) {
    console.error('Error in initKyc:', error);
    return { error, success: false };
  }
};

/**
 * Get KYC status from users endpoint
 * GET /api/users/kyc-status
 */
export const getUserKycStatus = async (token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, data: null };
  }

  try {
    const kycEndpoint = 'users/kyc-status';
    const kycService = createServiceREST(BASE_URL, kycEndpoint, token);

    const result = await kycService.get({
      headers: { 'X-Language': language },
    });

    return result;
  } catch (error) {
    console.error('Error in getUserKycStatus:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Get KYC dashboard URL (for viewing/updating KYC info)
 */
export const getKycDashboardUrl = async (token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, error: 'Backend URL not configured' };
  }

  try {
    const kycEndpoint = 'kyc/dashboard-url';
    const kycService = createServiceREST(BASE_URL, kycEndpoint, token);

    const result = await kycService.get({
      headers: { 'X-Language': language },
    });

    return result;
  } catch (error) {
    console.error('Error in getKycDashboardUrl:', error);
    return { error, success: false };
  }
};
