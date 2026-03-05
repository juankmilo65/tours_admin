/**
 * Country Types
 * Types for countries management
 */

export interface CountryDropdown {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
  description_es?: string | null;
  description_en?: string | null;
  flagUrl?: string | null;
  currencySymbol?: string;
  currencyCode?: string;
  nationality_es: string | null;
  nationality_en: string | null;
  isActive: boolean;
}

export interface CountryDropdownResponse {
  success: boolean;
  data?: CountryDropdown[];
  message?: string;
  error?: string;
}
