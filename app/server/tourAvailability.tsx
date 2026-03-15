import { createServiceREST } from './_index';
import type { TourAvailabilityResult } from '~/types/tourAvailability';

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
 * Get tour availability from external API
 * @param tourId - Tour ID
 * @param startDate - Start date (YYYY-MM-DD format)
 * @param endDate - End date (YYYY-MM-DD format)
 * @param token - Authentication token
 * @returns Tour availability information
 */
export async function getTourAvailability(
  tourId: string,
  startDate: string,
  endDate: string,
  token: string
): Promise<TourAvailabilityResult> {
  console.warn('🎯 [GET TOUR AVAILABILITY] Starting with params:', {
    tourId,
    startDate,
    endDate,
    hasToken: token !== '',
    BASE_URL,
  });

  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('⚠️ [GET TOUR AVAILABILITY] BACKEND_URL is not configured, returning empty');
    return { success: false, message: 'Backend URL not configured' };
  }

  try {
    const endpoint = `tours/${tourId}/availability`;
    const service = createServiceREST(BASE_URL, endpoint, `Bearer ${token}`);

    console.warn('🌐 [GET TOUR AVAILABILITY] Calling backend with query params:', {
      startDate,
      endDate,
    });

    const result = await service.get({
      params: {
        startDate,
        endDate,
      },
    });

    console.warn('✅ [GET TOUR AVAILABILITY] Success! Result:', JSON.stringify(result, null, 2));
    return result as TourAvailabilityResult;
  } catch (error) {
    console.error('❌ [GET TOUR AVAILABILITY] Error caught:', error);
    if (error instanceof Error) {
      console.error('❌ [GET TOUR AVAILABILITY] Error message:', error.message);
      console.error('❌ [GET TOUR AVAILABILITY] Error stack:', error.stack);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          '⚠️ [GET TOUR AVAILABILITY] Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('❌ [GET TOUR AVAILABILITY] Unknown error:', error);
    }
    return { success: false, message: 'Network error while fetching tour availability' };
  }
}
