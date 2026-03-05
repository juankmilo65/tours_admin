/**
 * Identification Types Types
 * Types for identification types management
 */

export interface IdentificationType {
  id: string;
  code: string;
  name: string;
  countryCode?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IdentificationTypeDropdown {
  id: string;
  name_es: string;
  name_en: string;
}

export interface IdentificationTypeDropdownResponse {
  success: boolean;
  data?: IdentificationTypeDropdown[];
  message?: string;
  error?: string;
}
