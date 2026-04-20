/**
 * User Commissions Business Logic - Business Logic Layer for User Commission Management
 */

import {
  getUserCommissions,
  getUserCommissionByUserId,
  createUserCommission,
} from '../userCommissions';
import type {
  UserCommission,
  UserCommissionResponse,
  UserCommissionsResponse,
  CreateUserCommissionDto,
} from '~/types/UserCommissionProps';

// Re-export types for components to use
export type {
  UserCommission,
  UserCommissionResponse,
  UserCommissionsResponse,
  CreateUserCommissionDto,
};

/**
 * Get all user commissions - for use in components
 */
export const getUserCommissionsBusiness = async (params: {
  token: string;
}): Promise<UserCommissionsResponse> => {
  try {
    const result = (await getUserCommissions(params.token)) as UserCommissionsResponse;
    if (result.data !== undefined && Array.isArray(result.data)) {
      return {
        ...result,
        data: result.data,
      };
    }
    return result;
  } catch (error) {
    console.error('Error in getUserCommissionsBusiness:', error);
    return { success: false, data: [] };
  }
};

/**
 * Get user commission by user ID - for use in components
 */
export const getUserCommissionByUserIdBusiness = async (
  userId: string,
  token: string
): Promise<UserCommissionResponse> => {
  try {
    const result = (await getUserCommissionByUserId(userId, token)) as UserCommissionResponse;
    return result;
  } catch (error) {
    console.error('Error in getUserCommissionByUserIdBusiness:', error);
    return { success: false };
  }
};

/**
 * Create or update user commission - for use in components
 */
export const createUserCommissionBusiness = async (
  data: CreateUserCommissionDto,
  token: string
): Promise<UserCommissionResponse> => {
  try {
    const result = (await createUserCommission(data, token)) as UserCommissionResponse;
    return result;
  } catch (error) {
    console.error('Error in createUserCommissionBusiness:', error);
    return { success: false };
  }
};
