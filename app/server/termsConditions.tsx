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

export interface TermsConditionsResponse {
  success?: boolean;
  data?: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    version: string;
    effectiveDate: string;
    language: string;
    termsConditions_es?: string;
    termsConditions_en?: string;
  }>;
  error?: unknown;
  count?: number;
}

/**
 * Get terms and conditions by type from backend API
 */
export const getTermsConditionsByType = async (
  type: string,
  language?: string
): Promise<TermsConditionsResponse> => {
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    return { success: false, data: undefined };
  }

  try {
    const termsEndpoint = `terms-conditions/type/${type}`;
    const termsService = createServiceREST(BASE_URL, termsEndpoint, 'Bearer');

    const result = await termsService.get({
      headers: {
        'X-Language': language ?? 'es',
      },
    });

    return result as TermsConditionsResponse;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    if (error instanceof Error) {
      console.error('Error in getTermsConditions service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure the backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getTermsConditions service:', error);
    }
    return { error, success: false, data: undefined };
  }
};
