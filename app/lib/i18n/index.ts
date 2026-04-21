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
export { paymentsEn } from './payments/en';
export { paymentsEs } from './payments/es';
export { kycEn } from './kyc/en';
export { kycEs } from './kyc/es';
export { errorsEn } from './errors/en';
export { errorsEs } from './errors/es';
export { profileEn } from './profile/en';
export { profileEs } from './profile/es';

// Utils
export {
  translations,
  t,
  isLanguageSupported,
  getDefaultLanguage,
  formatTranslation,
  useTranslation,
} from './utils';
