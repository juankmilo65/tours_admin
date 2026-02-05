/**
 * Languages Slice
 * Manages languages state with multi-language support
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Language } from '~/lib/i18n/types';

// Raw language from API with both languages
export interface LanguageOption {
  id: string;
  code: string;
  name_es: string;
  name_en: string;
}

// Translated language for display
export interface TranslatedLanguage {
  id: string;
  code: string;
  name: string;
}

// Translation helper functions
export function translateLanguage(language: LanguageOption, lang: Language): TranslatedLanguage {
  return {
    id: language.id,
    code: language.code,
    name: lang === 'es' ? language.name_es : language.name_en,
  };
}

export function translateLanguages(
  languages: LanguageOption[],
  lang: Language
): TranslatedLanguage[] {
  return languages.map((langOpt) => translateLanguage(langOpt, lang));
}

interface LanguagesState {
  languages: LanguageOption[];
  isLoading: boolean;
  error: string | null;
}

const initialState: LanguagesState = {
  languages: [],
  isLoading: false,
  error: null,
};

const languagesSlice = createSlice({
  name: 'languages',
  initialState,
  reducers: {
    fetchLanguagesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchLanguagesSuccess: (state, action: PayloadAction<LanguageOption[]>) => {
      state.languages = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchLanguagesFailure: (state, action: PayloadAction<string>) => {
      state.languages = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { fetchLanguagesStart, fetchLanguagesSuccess, fetchLanguagesFailure, clearError } =
  languagesSlice.actions;

// Selectors
export const selectLanguages = (state: { languages: LanguagesState }): LanguageOption[] =>
  state.languages.languages;
export const selectLanguagesLoading = (state: { languages: LanguagesState }): boolean =>
  state.languages.isLoading;
export const selectLanguagesError = (state: { languages: LanguagesState }): string | null =>
  state.languages.error;

export default languagesSlice.reducer;
