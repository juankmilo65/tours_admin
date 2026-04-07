import { createServiceREST } from './_index';

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
 * Get all cancellation policies from backend API
 */
export const getCancellationPolicies = async (token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [CANCELLATION POLICIES] BACKEND_URL is not configured');
    return { success: false, data: [] };
  }

  try {
    const service = createServiceREST(BASE_URL, 'cancellation-policies', token);
    const result = await service.get({
      headers: { 'X-Language': language },
    });
    return result;
  } catch (error) {
    console.error('❌ [CANCELLATION POLICIES] Error:', error);
    return { error, success: false, data: [] };
  }
};
