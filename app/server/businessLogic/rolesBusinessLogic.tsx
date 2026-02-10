/**
 * Roles Business Logic - Business Logic Layer for Role Management
 */

import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  associateMenusToRole,
} from '../roles';
import type {
  Role,
  RoleResponse,
  RolesResponse,
  CreateRoleDto,
  UpdateRoleDto,
  AssociateMenusToRoleDto,
} from '~/types/RoleProps';

// Re-export types for components to use
export type { Role, RoleResponse, RolesResponse, CreateRoleDto, UpdateRoleDto };

/**
 * Get all roles - for use in components
 */
export const getRolesBusiness = async (params: {
  token?: string;
  page?: number;
  limit?: number;
  language?: string;
}): Promise<RolesResponse> => {
  try {
    const result = (await getRoles(params)) as RolesResponse;
    // Handle new backend response structure where data is array and pagination is separate
    if (result.data !== undefined && Array.isArray(result.data)) {
      return {
        ...result,
        data: result.data,
      };
    }
    return result;
  } catch (error) {
    console.error('Error in getRolesBusiness:', error);
    return { success: false, data: [] };
  }
};

/**
 * Get role by ID - for use in components
 */
export const getRoleByIdBusiness = async (
  id: string,
  token: string,
  language = 'es'
): Promise<RoleResponse> => {
  try {
    const result = (await getRoleById(id, token, language)) as RoleResponse;
    return result;
  } catch (error) {
    console.error('Error in getRoleByIdBusiness:', error);
    return { success: false };
  }
};

/**
 * Create role - for use in components
 */
export const createRoleBusiness = async (
  data: CreateRoleDto,
  token: string,
  language = 'es'
): Promise<RoleResponse> => {
  try {
    const result = (await createRole(data, token, language)) as RoleResponse;
    return result;
  } catch (error) {
    console.error('Error in createRoleBusiness:', error);
    return { success: false };
  }
};

/**
 * Update role - for use in components
 */
export const updateRoleBusiness = async (
  roleId: string,
  data: UpdateRoleDto,
  token: string,
  language = 'es'
): Promise<RoleResponse> => {
  try {
    const result = (await updateRole(roleId, data, token, language)) as RoleResponse;
    return result;
  } catch (error) {
    console.error('Error in updateRoleBusiness:', error);
    return { success: false };
  }
};

/**
 * Delete role - for use in components
 */
export const deleteRoleBusiness = async (roleId: string, token: string): Promise<RoleResponse> => {
  try {
    const result = (await deleteRole(roleId, token)) as RoleResponse;
    return result;
  } catch (error) {
    console.error('Error in deleteRoleBusiness:', error);
    return { success: false };
  }
};

/**
 * Associate menus to role - for use in components
 */
export const associateMenusToRoleBusiness = async (
  roleId: string,
  data: AssociateMenusToRoleDto,
  token: string,
  language = 'es'
): Promise<RoleResponse> => {
  try {
    const result = (await associateMenusToRole(roleId, data, token, language)) as RoleResponse;
    return result;
  } catch (error) {
    console.error('Error in associateMenusToRoleBusiness:', error);
    return { success: false };
  }
};
