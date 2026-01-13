import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL ?? '';

export interface TermsConditionsResponse {
  success?: boolean;
  data?: {
    id: string;
    type: string;
    title: string;
    content: string;
    version: string;
    effectiveDate: string;
    language: string;
  };
  error?: unknown;
}

/**
 * Get terms and conditions by type from backend API
 */
export const getTermsConditionsByType = async (
  type: string,
  language?: string
): Promise<TermsConditionsResponse> => {
  console.warn('getTermsConditionsByType called with type:', type, 'language:', language);
  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for terms and conditions');
    return { success: false, data: undefined };
  }

  try {
    const termsEndpoint = `terms-conditions/type/${type}`;
    console.warn('Making request to:', `${BASE_URL}${termsEndpoint}`, 'with language:', language);
    const termsService = createServiceREST(BASE_URL, termsEndpoint, 'Bearer');

    const result = await termsService.get({
      headers: {
        'X-Language': language ?? 'es',
      },
    });
    console.warn('Request result:', result);

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
