/**
 * Menu Types
 */

export interface SubMenuItem {
  id: string;
  menu: string;
  label_es: string;
  label_en: string;
  path: string;
  icon: string;
  sortOrder?: number;
}

export interface NavItem {
  id: string;
  menu: string;
  label_es: string;
  label_en: string;
  icon: string;
  sortOrder?: number;
  submenu: SubMenuItem[];
}

export interface Menu {
  id: string;
  path: string;
  labelKey: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  roles?: Role[];
}

export interface Role {
  id: string;
  name: string;
  slug: string;
}

export interface ParentMenuItem {
  id: string;
  label_es: string;
  label_en: string;
}

export interface CreateMenuDto {
  app: string;
  path?: string;
  parentId?: string;
  label_es: string;
  label_en: string;
  icon: string;
  sort_order?: number;
  isActive: boolean;
}

export interface UpdateMenuDto {
  path?: string;
  parentId?: string;
  labelKey?: string;
  icon?: string;
  sort_order?: number;
  isActive?: boolean;
}

export interface GetParentMenusParams {
  app: string;
  isActive?: boolean;
  token?: string;
}

export interface ParentMenusResponse {
  success: boolean;
  data?: ParentMenuItem[];
  message?: string;
  error?: { message?: string };
}

export interface MenuResponse {
  success: boolean;
  data?: Menu;
  message?: string;
  error?: { message?: string };
}

export interface MenusResponse {
  success: boolean;
  data?: Menu[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  error?: { message?: string };
}

export interface GetMenusParams {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  language?: string;
  token?: string;
}
