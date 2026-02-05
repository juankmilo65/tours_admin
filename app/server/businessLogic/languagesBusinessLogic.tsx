import {
  getLanguagesDropdown,
  type LanguagesDropdownResponse,
  type LanguageOption,
} from '../languages';

// Re-export types for components to use
export type { LanguageOption, LanguagesDropdownResponse };

/**
 * Business logic for getting languages dropdown (simplified list for select/dropdown)
 * Exported directly for use in components
 */
export const getLanguagesDropdownBusiness = async (
  language = 'es'
): Promise<LanguagesDropdownResponse> => {
  try {
    return await getLanguagesDropdown(language);
  } catch (error: unknown) {
    console.error('Error in getLanguagesDropdownBusiness:', error);
    return { success: false, data: [] };
  }
};
