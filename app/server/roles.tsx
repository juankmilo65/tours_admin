/**
 * Roles Service - API Integration for Role Management
 */

import { createServiceREST } from './_index';
import type {
  CreateRoleDto,
  UpdateRoleDto,
  AssociateMenusToRoleDto,
  GetRolesParams,
} from '../types/RoleProps';

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
 * Get all roles with pagination
 */
export const getRoles = async (params: GetRolesParams = {}): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for roles');
    return {
      success: false,
      data: {
        roles: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
    };
  }

  try {
    const { page = 1, limit = 10, language = 'es', token } = params;

    const queryParams: Record<string, string | number> = { page, limit };

    // Only add isActive if it's provided (not empty string)
    if (params.isActive !== undefined && params.isActive !== '') {
      queryParams.isActive = params.isActive as string;
    }

    const rolesEndpoint = 'roles';
    const rolesService = createServiceREST(
      BASE_URL,
      rolesEndpoint,
      token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer'
    );

    const result = await rolesService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getRoles service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getRoles service:', error);
    }
    return {
      error,
      success: false,
      data: {
        roles: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
    };
  }
};

/**
 * Get role by ID
 */
export const getRoleById = async (id: string, token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, data: null };
  }

  try {
    const roleEndpoint = `roles/${id}`;
    const roleService = createServiceREST(BASE_URL, roleEndpoint, `Bearer ${token}`);

    const result = await roleService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getRoleById service:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Create new role
 */
export const createRole = async (
  data: CreateRoleDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const rolesEndpoint = 'roles';
  const rolesService = createServiceREST(BASE_URL, rolesEndpoint, `Bearer ${token}`);

  const result = await rolesService.create(data, {
    headers: {
      'X-Language': language,
    },
  });
  return result;
};

/**
 * Update role
 */
export const updateRole = async (
  roleId: string,
  data: UpdateRoleDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const rolesEndpoint = `roles/${roleId}`;
  const rolesService = createServiceREST(BASE_URL, 'roles', `Bearer ${token}`);

  const result = await rolesService.update(data, {
    headers: {
      'X-Language': language,
    },
    url: `/${rolesEndpoint}`,
  });
  return result;
};

/**
 * Delete role
 */
export const deleteRole = async (roleId: string, token: string): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const rolesEndpoint = `roles/${roleId}`;
  const roleService = createServiceREST(BASE_URL, rolesEndpoint, `Bearer ${token}`);

  const result = await roleService.delete();
  return result;
};

/**
 * Associate menus to a role
 */
export const associateMenusToRole = async (
  roleId: string,
  data: AssociateMenusToRoleDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const rolesEndpoint = `roles/${roleId}/menus`;
  const rolesService = createServiceREST(BASE_URL, 'roles', `Bearer ${token}`);

  const result = await rolesService.create(data, {
    url: `/${rolesEndpoint}`,
    headers: {
      'X-Language': language,
    },
  });
  return result;
};
