/**
 * Menus Business Logic - Business Logic Layer for Menu Management
 */

import {
  getMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  associateRolesToMenu,
  getUserMenu,
  getParentMenus,
} from '../menus';
import type { ServiceResult } from '../_index';
import type {
  Menu,
  MenuResponse,
  MenusResponse,
  CreateMenuDto,
  UpdateMenuDto,
  NavItem,
  ParentMenuItem,
  ParentMenusResponse,
} from '~/types/MenuProps';

// Re-export types for components to use
export type {
  Menu,
  MenuResponse,
  MenusResponse,
  CreateMenuDto,
  UpdateMenuDto,
  NavItem,
  ParentMenuItem,
};

interface MenusPayload {
  token?: string;
  action: string;
  menuId?: string;
  language?: string;
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  menuData?: CreateMenuDto | UpdateMenuDto;
  roleIds?: string[];
}

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData, token = ''): MenusPayload => {
  const action = formData.get('action');
  const menuId = formData.get('menuId');
  const language = formData.get('language');
  const page = formData.get('page');
  const limit = formData.get('limit');
  const role = formData.get('role');
  const isActive = formData.get('isActive');
  const roleIds = formData.get('roleIds');

  return {
    token,
    action: action !== null && action !== undefined && typeof action === 'string' ? action : '',
    menuId:
      menuId !== null && menuId !== undefined && typeof menuId === 'string' ? menuId : undefined,
    language:
      language !== null && language !== undefined && typeof language === 'string' ? language : 'es',
    page:
      page !== null && page !== undefined && !Number.isNaN(Number(page)) ? Number(page) : undefined,
    limit:
      limit !== null && limit !== undefined && !Number.isNaN(Number(limit))
        ? Number(limit)
        : undefined,
    role: role !== null && role !== undefined && typeof role === 'string' ? role : undefined,
    isActive:
      isActive !== null && isActive !== undefined && typeof isActive === 'string'
        ? isActive === 'true'
        : undefined,
    roleIds:
      roleIds !== null && roleIds !== undefined && typeof roleIds === 'string'
        ? (JSON.parse(roleIds) as string[])
        : undefined,
  };
};

/**
 * Business logic for getting all menus (internal)
 */
const getMenusBusinessInternal = (data: MenusPayload): Promise<ServiceResult<unknown>> => {
  return getMenus({
    language: data.language ?? 'es',
    page: data.page,
    limit: data.limit,
    role: data.role,
    isActive: data.isActive,
    token: data.token,
  }).catch((error: unknown) => {
    console.error('Error in getMenusBusiness:', error);
    return { error };
  });
};

/**
 * Business logic for getting a menu by ID
 */
const getMenuByIdBusiness = (data: MenusPayload): Promise<ServiceResult<unknown>> => {
  const { menuId, language, token } = data;
  if (menuId === undefined || menuId === null || menuId === '' || token === undefined) {
    return Promise.resolve({ error: 'Menu ID and token are required' });
  }
  return getMenuById(menuId, token, language ?? 'es').catch((error: unknown) => {
    console.error('Error in getMenuByIdBusiness:', error);
    return { error };
  });
};

/**
 * Business logic for creating a new menu
 */
const createMenuBusiness = (data: MenusPayload): Promise<ServiceResult<unknown>> => {
  const { menuData, token, language } = data;
  if (menuData === undefined || token === undefined) {
    return Promise.resolve({ error: 'Menu data and token are required' });
  }
  return createMenu(menuData as CreateMenuDto, token, language ?? 'es').catch((error: unknown) => {
    console.error('Error in createMenuBusiness:', error);
    return { error };
  });
};

/**
 * Business logic for updating a menu
 */
const updateMenuBusiness = (data: MenusPayload): Promise<ServiceResult<unknown>> => {
  const { menuId, menuData, token, language } = data;
  if (menuId === undefined || menuId === null || menuId === '' || token === undefined) {
    return Promise.resolve({ error: 'Menu ID and token are required' });
  }
  if (menuData === undefined) {
    return Promise.resolve({ error: 'Menu data is required' });
  }
  return updateMenu(menuId, menuData as UpdateMenuDto, token, language ?? 'es').catch(
    (error: unknown) => {
      console.error('Error in updateMenuBusiness:', error);
      return { error };
    }
  );
};

/**
 * Business logic for deleting a menu
 */
const deleteMenuBusiness = (data: MenusPayload): Promise<ServiceResult<unknown>> => {
  const { menuId, token } = data;
  if (menuId === undefined || menuId === null || menuId === '' || token === undefined) {
    return Promise.resolve({ error: 'Menu ID and token are required' });
  }
  return deleteMenu(menuId, token).catch((error: unknown) => {
    console.error('Error in deleteMenuBusiness:', error);
    return { error };
  });
};

/**
 * Business logic for associating roles to a menu
 */
const associateRolesToMenuBusiness = (data: MenusPayload): Promise<ServiceResult<unknown>> => {
  const { menuId, roleIds, token } = data;
  if (menuId === undefined || menuId === null || menuId === '' || token === undefined) {
    return Promise.resolve({ error: 'Menu ID and token are required' });
  }
  if (roleIds === undefined || roleIds.length === 0) {
    return Promise.resolve({ error: 'Role IDs are required' });
  }
  return associateRolesToMenu(menuId, roleIds, token).catch((error: unknown) => {
    console.error('Error in associateRolesToMenuBusiness:', error);
    return { error };
  });
};

/**
 * Main business logic router
 */
const menusBusinessLogic = (
  action: string,
  data: MenusPayload
): Promise<ServiceResult<unknown>> => {
  switch (action) {
    case 'getMenusBusiness':
      return getMenusBusinessInternal(data);
    case 'getMenuByIdBusiness':
      return getMenuByIdBusiness(data);
    case 'createMenuBusiness':
      return createMenuBusiness(data);
    case 'updateMenuBusiness':
      return updateMenuBusiness(data);
    case 'deleteMenuBusiness':
      return deleteMenuBusiness(data);
    case 'associateRolesToMenuBusiness':
      return associateRolesToMenuBusiness(data);
    default:
      return Promise.resolve({
        error: {
          status: 400,
          message: 'Invalid action',
        },
      });
  }
};

/**
 * Main export function for FormData
 */
const menus = async (formData: FormData, token = ''): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData, token);
    return await menusBusinessLogic(payload.action, payload);
  } catch (error) {
    console.error('Error in menus business logic:', error);
    return { error };
  }
};

/**
 * Direct business logic functions for use in components
 * These are exported separately for direct use without FormData
 */

/**
 * Get all menus - for use in components
 */
export const getMenusBusiness = async (params: {
  token?: string;
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  language?: string;
}): Promise<MenusResponse> => {
  try {
    const result = (await getMenus(params)) as MenusResponse;
    return result;
  } catch (error) {
    console.error('Error in getMenusBusiness:', error);
    return { success: false, data: [] };
  }
};

/**
 * Get menu by ID - for use in components
 */
export const getMenuByIdBusinessDirect = async (
  id: string,
  token: string,
  language = 'es'
): Promise<MenuResponse> => {
  try {
    const result = (await getMenuById(id, token, language)) as MenuResponse;
    return result;
  } catch (error) {
    console.error('Error in getMenuByIdBusinessDirect:', error);
    return { success: false };
  }
};

/**
 * Create menu - for use in components
 */
export const createMenuBusinessDirect = async (
  data: CreateMenuDto,
  token: string,
  language = 'es'
): Promise<MenuResponse> => {
  try {
    const result = (await createMenu(data, token, language)) as MenuResponse;
    return result;
  } catch (error) {
    console.error('Error in createMenuBusinessDirect:', error);
    return { success: false };
  }
};

/**
 * Update menu - for use in components
 */
export const updateMenuBusinessDirect = async (
  menuId: string,
  data: UpdateMenuDto,
  token: string,
  language = 'es'
): Promise<MenuResponse> => {
  try {
    const result = (await updateMenu(menuId, data, token, language)) as MenuResponse;
    return result;
  } catch (error) {
    console.error('Error in updateMenuBusinessDirect:', error);
    return { success: false };
  }
};

/**
 * Delete menu - for use in components
 */
export const deleteMenuBusinessDirect = async (
  menuId: string,
  token: string
): Promise<{ success: boolean; message?: string; error?: { message?: string } }> => {
  try {
    const result = (await deleteMenu(menuId, token)) as {
      success: boolean;
      message?: string;
      error?: { message?: string };
    };
    return result;
  } catch (error) {
    console.error('Error in deleteMenuBusinessDirect:', error);
    return { success: false };
  }
};

/**
 * Associate roles to menu - for use in components
 */
export const associateRolesToMenuBusinessDirect = async (
  menuId: string,
  roleIds: string[],
  token: string
): Promise<{ success: boolean; message?: string; error?: { message?: string } }> => {
  try {
    const result = (await associateRolesToMenu(menuId, roleIds, token)) as {
      success: boolean;
      message?: string;
      error?: { message?: string };
    };
    return result;
  } catch (error) {
    console.error('Error in associateRolesToMenuBusinessDirect:', error);
    return { success: false };
  }
};

/**
 * Get user's menu - for use in Sidebar component
 * @param token - JWT authentication token
 * @param language - Language code (default: 'es')
 * @param app - Application identifier (default: 'admin')
 */
export const getUserMenuBusiness = async (
  token: string,
  language = 'es',
  app = 'admin'
): Promise<{ success: boolean; data?: NavItem[]; error?: { message?: string } }> => {
  try {
    const result = (await getUserMenu(token, language, app)) as {
      success: boolean;
      data?: NavItem[];
    };
    return result;
  } catch (error) {
    console.error('Error in getUserMenuBusiness:', error);
    return { success: false };
  }
};

/**
 * Get parent menus - for use in create/edit menu dropdown
 * @param token - JWT authentication token
 * @param app - Application identifier (default: 'admin')
 * @param isActive - Filter by active status (default: true)
 */
export const getParentMenusBusiness = async (
  token: string,
  app = 'admin',
  isActive = true
): Promise<ParentMenusResponse> => {
  try {
    const result = (await getParentMenus(token, app, isActive)) as ParentMenusResponse;
    return result;
  } catch (error) {
    console.error('Error in getParentMenusBusiness:', error);
    return { success: false, data: [] };
  }
};

export default menus;
