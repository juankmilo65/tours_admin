/**
 * Menu Types
 */

export interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

export interface MenuResponse {
  success: boolean;
  data?: NavItem[];
  message?: string;
  error?: { message?: string };
}
