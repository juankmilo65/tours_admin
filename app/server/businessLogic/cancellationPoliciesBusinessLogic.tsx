import { getCancellationPolicies } from '../cancellationPolicies';
import type { CancellationPolicy } from '~/types/cancellationPolicy';

export interface CancellationPoliciesResponse {
  success: boolean;
  data: CancellationPolicy[];
  error?: string;
}

/**
 * Get all cancellation policies
 */
export const getCancellationPoliciesBusiness = async (
  token: string,
  language = 'es'
): Promise<CancellationPoliciesResponse> => {
  try {
    const result = (await getCancellationPolicies(token, language)) as {
      success?: boolean;
      data?: CancellationPolicy[];
      error?: unknown;
    };

    if (result.success === true && Array.isArray(result.data)) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      data: [],
      error:
        language === 'en'
          ? 'Could not fetch cancellation policies'
          : 'No se pudieron obtener las políticas de cancelación',
    };
  } catch (error) {
    console.error('Error in getCancellationPoliciesBusiness:', error);
    return {
      success: false,
      data: [],
      error:
        language === 'en'
          ? 'Error loading cancellation policies'
          : 'Error al cargar las políticas de cancelación',
    };
  }
};
