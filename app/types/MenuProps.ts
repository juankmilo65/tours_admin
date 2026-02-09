/**
 * Menu Types
 */

export interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

export interface Menu {
  id: string;
  path: string;
  labelKey: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles?: Role[];
}

export interface Role {
  id: string;
  name: string;
  slug: string;
}

export interface CreateMenuDto {
  path: string;
  labelKey: string;
  icon: string;
  order: number;
  isActive: boolean;
}

export interface UpdateMenuDto {
  path?: string;
  labelKey?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
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
