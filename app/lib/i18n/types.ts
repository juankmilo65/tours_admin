/**
 * i18n Types - Tours Admin Dashboard
 */

export type Language = 'en' | 'es';

export interface Translation {
  [key: string]: string | Translation;
}

export interface Translations {
  [language: string]: Translation;
}

export const languages: Language[] = ['en', 'es'] as const;

export const defaultLanguage: Language = 'en' as const;

export type TranslationKey =
  | 'common'
  | 'sidebar'
  | 'header'
  | 'auth'
  | 'dashboard'
  | 'tours'
  | 'cities'
  | 'categories'
  | 'news'
  | 'offers'
  | 'reservations'
  | 'users'
  | 'settings'
  | 'validation'
  | 'pagination'
  | 'footer'
  | 'emptyStates';
