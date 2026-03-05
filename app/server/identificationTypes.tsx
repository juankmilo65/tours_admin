/**
 * Identification Types Service - HTTP layer for Identification Types API
 */

import { createServiceREST } from './_index';
import { logCurlGet } from './curlHelper';

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
 * Get identification types for dropdown
 * Public endpoint - does not require authentication
 */
export const getIdentificationTypesDropdown = async (
  countryCode: string | null = null,
  active = true,
  language = 'es'
): Promise<unknown> => {
  console.warn('🎯 [GET IDENTIFICATION TYPES DROPDOWN] Starting with params:', {
    countryCode,
    active,
    language,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn(
      '⚠️ [GET IDENTIFICATION TYPES DROPDOWN] BACKEND_URL is not configured, returning empty'
    );
    return { success: false, data: [] };
  }

  try {
    const identificationTypesEndpoint = 'identification-types/dropdown';
    const fullUrl = `${BASE_URL}/${identificationTypesEndpoint}`;
    console.warn('🌐 [GET IDENTIFICATION TYPES DROPDOWN] Full URL to call:', fullUrl);

    // Build query params
    const params: Record<string, string> = {};
    if (countryCode !== null && countryCode !== '') {
      params.countryCode = countryCode;
    }
    params.active = active.toString();

    // Log curl command if debug is enabled
    logCurlGet({
      url: `${BASE_URL}/${identificationTypesEndpoint}`,
      params,
      headers: { 'X-Language': language },
      label: 'GET IDENTIFICATION TYPES DROPDOWN',
    });

    // No token needed - public endpoint
    const identificationTypesService = createServiceREST(BASE_URL, identificationTypesEndpoint, '');
    console.warn('📡 [GET IDENTIFICATION TYPES DROPDOWN] Calling backend with headers:', {
      'X-Language': language,
      params,
    });

    const result = await identificationTypesService.get({
      params,
      headers: {
        'X-Language': language,
      },
    });

    console.warn(
      '✅ [GET IDENTIFICATION TYPES DROPDOWN] Success! Result:',
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    console.error('❌ [GET IDENTIFICATION TYPES DROPDOWN] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET IDENTIFICATION TYPES DROPDOWN] Error message:', error.message);
      console.error('❌ [GET IDENTIFICATION TYPES DROPDOWN] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET IDENTIFICATION TYPES DROPDOWN] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET IDENTIFICATION TYPES DROPDOWN] Unknown error:', error);
    }
    return { error, success: false, data: [] };
  }
};
