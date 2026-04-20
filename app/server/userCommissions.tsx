/**
 * User Commissions Service - API Integration for User Commission Management
 */

import { createServiceREST } from './_index';
import type { CreateUserCommissionDto } from '../types/UserCommissionProps';

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
 * Get all user commissions
 */
export const getUserCommissions = async (token: string): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for user commissions');
    return { success: false, data: [] };
  }

  try {
    const endpoint = 'user-commissions';
    const service = createServiceREST(BASE_URL, endpoint, token);

    const result = await service.get();
    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getUserCommissions service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getUserCommissions service:', error);
    }
    return { error, success: false, data: [] };
  }
};

/**
 * Get user commission by user ID
 */
export const getUserCommissionByUserId = async (
  userId: string,
  token: string
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, data: null };
  }

  try {
    const endpoint = `user-commissions/${userId}`;
    const service = createServiceREST(BASE_URL, endpoint, token);

    const result = await service.get();
    return result;
  } catch (error) {
    console.error('Error in getUserCommissionByUserId service:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Create or update user commission
 */
export const createUserCommission = async (
  data: CreateUserCommissionDto,
  token: string
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const endpoint = 'user-commissions';
  const service = createServiceREST(BASE_URL, endpoint, token);

  const result = await service.create(data);
  return result;
};
