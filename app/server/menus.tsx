/**
 * Menus Service - API Integration for Menu Management
 */

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
 * Get user's menu based on their role
 * The endpoint automatically extracts the role from the JWT token
 */
export const getUserMenu = async (token: string, language = 'es'): Promise<unknown> => {
  console.warn('🎯 [GET USER MENU] Starting getUserMenu with params:', {
    hasToken: token !== '',
    language,
    BASE_URL,
  });

  // Check if backend URL is configured
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET USER MENU] BACKEND_URL is not configured, returning empty menu');
    return {
      success: false,
      data: [],
    };
  }

  try {
    const menuEndpoint = 'menus/my-menu';
    const fullUrl = `${BASE_URL}/${menuEndpoint}`;
    console.warn('🌐 [GET USER MENU] Full URL to call:', fullUrl);

    const menuService = createServiceREST(BASE_URL, menuEndpoint, `Bearer ${token}`);
    console.warn('📡 [GET USER MENU] Calling backend with headers:', {
      'X-Language': language,
      Authorization: `Bearer ${token.substring(0, 20)}...`,
    });

    const result = await menuService.get({
      headers: {
        'X-Language': language,
      },
    });

    console.warn('✅ [GET USER MENU] Success! Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    // Handle network errors gracefully (ECONNREFUSED, etc.)
    console.error('❌ [GET USER MENU] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET USER MENU] Error message:', error.message);
      console.error('❌ [GET USER MENU] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET USER MENU] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET USER MENU] Unknown error:', error);
    }
    return { error, success: false, data: [] };
  }
};
