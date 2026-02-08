/**
 * Menus Business Logic - Business layer for Menu Management
 */

import { getUserMenu } from '../menus';
import type { NavItem, MenuResponse } from '../../types/MenuProps';

export type { NavItem, MenuResponse };

/**
 * Get user's menu based on their role
 * The role is automatically extracted from the JWT token in the backend
 */
export const getUserMenuBusiness = async (
  token: string,
  language = 'es'
): Promise<{ success: boolean; data?: NavItem[] }> => {
  try {
    const result = (await getUserMenu(token, language)) as MenuResponse;

    if (result.success === true && result.data !== undefined) {
      return result as { success: boolean; data?: NavItem[] };
    }

    return {
      success: false,
      data: [],
    };
  } catch (error) {
    console.error('Error in getUserMenuBusiness:', error);
    return {
      success: false,
      data: [],
    };
  }
};
