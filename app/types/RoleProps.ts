/**
 * Role Types - Type definitions for Role Management
 */

// Role menu association
export interface MenuRole {
  id: string;
  menuId: string;
  roleId: string;
  createdAt: string;
  menu: {
    id: string;
    label_es: string;
    label_en: string;
    path: string | null;
  };
}

// Role entity
export interface Role {
  id: string;
  name: string; // slug
  name_es: string;
  name_en: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  menuRoles: MenuRole[];
  _count: {
    menuRoles: number;
  };
}

export interface CreateRoleDto {
  name: string; // slug
  name_es: string;
  name_en: string;
  description: string;
  permissions?: string[];
}

export interface UpdateRoleDto {
  name?: string; // slug
  name_es?: string;
  name_en?: string;
  description?: string;
  permissions?: string[];
}

export interface RoleResponse {
  success: boolean;
  data?: Role;
  message?: string;
  error?: {
    message?: string;
    dependencies?: string[];
    details?: {
      name?: string;
      name_es?: string;
      name_en?: string;
    };
  };
}

export interface RolesResponse {
  success: boolean;
  data?: Role[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    from: number;
    to: number;
  };
  message?: string;
  error?: { message?: string };
}

export interface AssociateMenusToRoleDto {
  menuIds: string[];
}

export interface GetRolesParams {
  page?: number;
  limit?: number;
  isActive?: boolean | string;
  language?: string;
  token?: string;
}
