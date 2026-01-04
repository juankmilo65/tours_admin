/**
 * i18n Utilities - Tours Admin Dashboard
 */

import { useSelector } from 'react-redux';
import { en } from './en';
import { es } from './es';
import type { Language, Translation } from './types';
import { selectLanguage } from '~/store/slices/uiSlice';

export const translations: Record<Language, Translation> = {
  en,
  es,
};

/**
 * Get translation by key path
 * @param key - Translation key path (e.g., 'common.save')
 * @param lang - Language code
 * @returns Translated string
 */
export function t(key: string, lang: Language = 'en'): string {
  const keys = key.split('.');
  let value: Translation | string = translations[lang];

  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      const nextValue: string | Translation | undefined = value[k];
      if (nextValue !== undefined) {
        value = nextValue;
      } else {
        // Fallback to English if translation not found
        if (lang !== 'en') {
          return t(key, 'en');
        }
        return key;
      }
    } else {
      // Fallback to English if translation not found
      if (lang !== 'en') {
        return t(key, 'en');
      }
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

/**
 * Check if a language is supported
 * @param lang - Language code
 * @returns True if supported
 */
export function isLanguageSupported(lang: string): lang is Language {
  return lang in translations;
}

/**
 * Get the default language from browser or settings
 * @returns Language code
 */
export function getDefaultLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'es';
  }

  const browserLang = navigator.language.split('-')[0] as Language;
  return isLanguageSupported(browserLang) ? browserLang : 'es';
}

/**
 * Replace placeholders in translation string
 * @param template - Translation template
 * @param params - Parameters to replace
 * @returns Formatted translation
 */
export function formatTranslation(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() ?? match;
  });
}

/**
 * React hook for translations
 * Uses Redux store for language state
 * @returns Object with translation function and current language
 */
export function useTranslation() {
  const language = useSelector(selectLanguage) as Language;

  const translate = (key: string, params?: Record<string, string | number>): string => {
    const translated = t(key, language);
    if (params) {
      return formatTranslation(translated, params);
    }
    return translated;
  };

  return {
    t: translate,
    language,
  };
}
