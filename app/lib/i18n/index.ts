/**
 * i18n Module - Tours Admin Dashboard
 * Centralized exports for internationalization
 */

// Types
export type { Language, Translation, TranslationKey } from './types';
export { languages, defaultLanguage } from './types';

// Translations
export { en } from './en';
export { es } from './es';

// Component-specific translations
export { bookingEn } from './booking/en';
export { bookingEs } from './booking/es';

// Utils
export {
  translations,
  t,
  isLanguageSupported,
  getDefaultLanguage,
  formatTranslation,
  useTranslation,
} from './utils';
