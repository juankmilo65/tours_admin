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

export interface LanguageOption {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
}

/**
 * Response for languages dropdown endpoint
 */
export interface LanguagesDropdownResponse {
  success: boolean;
  data: LanguageOption[];
}

/**
 * Get languages for dropdown (simplified list)
 * Uses by /api/languages/dropdown endpoint
 */
export const getLanguagesDropdown = async (language = 'es'): Promise<LanguagesDropdownResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for languages dropdown');
    return { success: false, data: [] };
  }

  try {
    const languagesDropdownEndpoint = 'languages/dropdown';
    const languagesService = createServiceREST(BASE_URL, languagesDropdownEndpoint, 'Bearer');

    const result = await languagesService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result as LanguagesDropdownResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getLanguagesDropdown service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getLanguagesDropdown service:', error);
    }
    return { success: false, data: [] };
  }
};
