/**
 * Menus Service - API Integration for Menu Management
 */

import { createServiceREST } from './_index';
import type { CreateMenuDto, UpdateMenuDto, GetMenusParams } from '../types/MenuProps';

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
 * Get all menus with filters and pagination
 */
export const getMenus = async (params: GetMenusParams = {}): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty for menus');
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  try {
    const { page = 1, limit = 10, isActive, role, language = 'es', token } = params;

    const queryParams: Record<string, string | number> = { page, limit };
    if (isActive !== undefined) {
      queryParams.isActive = isActive.toString();
    }
    if (role !== undefined && role !== '') {
      queryParams.role = role;
    }

    const menusEndpoint = 'menus';
    const menusService = createServiceREST(
      BASE_URL,
      menusEndpoint,
      token !== undefined && token !== '' ? `Bearer ${token}` : 'Bearer'
    );

    const result = await menusService.get({
      params: queryParams,
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getMenus service:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(
          'Backend API is not available. Please ensure that backend server is running at:',
          BASE_URL
        );
      }
    } else {
      console.error('Unknown error in getMenus service:', error);
    }
    return {
      error,
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
};

/**
 * Get menu by ID
 */
export const getMenuById = async (id: string, token: string, language = 'es'): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, data: null };
  }

  try {
    const menuEndpoint = `menus/${id}`;
    const menuService = createServiceREST(BASE_URL, menuEndpoint, `Bearer ${token}`);

    const result = await menuService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getMenuById service:', error);
    return { error, success: false, data: null };
  }
};

/**
 * Create new menu
 */
export const createMenu = async (
  data: CreateMenuDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const menusEndpoint = 'menus';
  const menusService = createServiceREST(BASE_URL, menusEndpoint, `Bearer ${token}`);

  const result = await menusService.create(data, {
    headers: {
      'X-Language': language,
    },
  });
  return result;
};

/**
 * Update menu
 */
export const updateMenu = async (
  menuId: string,
  data: UpdateMenuDto,
  token: string,
  language = 'es'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const menusEndpoint = `menus/${menuId}`;
  const menusService = createServiceREST(BASE_URL, 'menus', `Bearer ${token}`);

  const result = await menusService.update(data, {
    headers: {
      'X-Language': language,
    },
    url: `/${menusEndpoint}`,
  });
  return result;
};

/**
 * Delete menu
 */
export const deleteMenu = async (menuId: string, token: string): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const menusEndpoint = `menus/${menuId}`;
  const menuService = createServiceREST(BASE_URL, menusEndpoint, `Bearer ${token}`);

  const result = await menuService.delete();
  return result;
};

/**
 * Associate roles to a menu
 */
export const associateRolesToMenu = async (
  menuId: string,
  roleIds: string[],
  token: string
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    throw new Error('BACKEND_URL is not configured');
  }

  const menusEndpoint = `menus/${menuId}/roles`;
  const menusService = createServiceREST(BASE_URL, 'menus', `Bearer ${token}`);

  const result = await menusService.create(
    { roleIds },
    {
      url: `/${menusEndpoint}`,
    }
  );
  return result;
};

/**
 * Get user's menu based on their role
 * The endpoint automatically extracts; role from; JWT token
 * @param token - JWT authentication token
 * @param language - Language code (default: 'es')
 * @param app - Application identifier (default: 'admin')
 */
export const getUserMenu = async (
  token: string,
  language = 'es',
  app = 'admin'
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty menu');
    return {
      success: false,
      data: [],
    };
  }

  try {
    const menuEndpoint = `menus/my-menu?app=${app}`;
    const menuService = createServiceREST(BASE_URL, menuEndpoint, `Bearer ${token}`);

    const result = await menuService.get({
      headers: {
        'X-Language': language,
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getUserMenu service:', error);
    return { error, success: false, data: [] };
  }
};

/**
 * Get parent menus for dropdown
 * @param token - JWT authentication token
 * @param app - Application identifier (default: 'admin')
 * @param isActive - Filter by active status (default: true)
 */
export const getParentMenus = async (
  token: string,
  app = 'admin',
  isActive = true
): Promise<unknown> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured, returning empty parents');
    return {
      success: false,
      data: [],
    };
  }

  try {
    const queryParams: Record<string, string | boolean> = { app };
    if (isActive !== undefined) {
      queryParams.isActive = isActive;
    }

    const parentsEndpoint = `menus/parents`;
    const parentsService = createServiceREST(BASE_URL, parentsEndpoint, `Bearer ${token}`);

    const result = await parentsService.get({
      params: queryParams,
      headers: {
        'X-Language': 'es',
      },
    });

    return result;
  } catch (error) {
    console.error('Error in getParentMenus service:', error);
    return { error, success: false, data: [] };
  }
};
