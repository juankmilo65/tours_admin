/**
 * Terms & Conditions Master - API service
 * Endpoint: GET /api/terms-conditions-master/type/{type}?version={version}
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

export interface TermsMasterItem {
  id: string;
  termsConditions_es: string;
  termsConditions_en: string;
  type: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isLastVersion: boolean;
}

export interface TermsMasterResponse {
  success: boolean;
  data?: TermsMasterItem[];
  count?: number;
  error?: unknown;
}

export interface AcceptTermsMasterResponse {
  success: boolean;
  message?: string;
  error?: unknown;
}

/**
 * Fetches terms & conditions master list by type (e.g. "registration").
 * Public endpoint — no auth required.
 */
export const getTermsMasterByType = async (
  type: string,
  version?: string,
  language = 'es'
): Promise<TermsMasterResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, data: [] };
  }

  try {
    // createServiceREST already prefixes /api, so endpoint must not repeat it.
    const endpoint = `terms-conditions-master/type/${type}`;
    const service = createServiceREST(BASE_URL, endpoint, '');

    const params: Record<string, string> = {};
    if (version !== undefined && version !== '') {
      params.version = version;
    }

    const result = await service.get({
      params,
      headers: { 'X-Language': language },
    });

    return result as TermsMasterResponse;
  } catch (error) {
    console.error('[termsMaster] getTermsMasterByType error:', error);
    return { success: false, data: [], error };
  }
};

/**
 * Accept latest terms for authenticated user.
 * Endpoint: POST /api/terms-conditions-master/accept
 */
export const acceptTermsMaster = async (
  termsConditionsId: string,
  token: string,
  language = 'es'
): Promise<AcceptTermsMasterResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined || token === '' || termsConditionsId === '') {
    return { success: false };
  }

  try {
    const endpoint = 'terms-conditions-master/accept';
    const service = createServiceREST(BASE_URL, endpoint, token);

    const result = await service.create(
      { termsConditionsId },
      {
        headers: { 'X-Language': language },
      }
    );

    return result as AcceptTermsMasterResponse;
  } catch (error) {
    console.error('[termsMaster] acceptTermsMaster error:', error);
    return { success: false, error };
  }
};
