/**
 * Categories Slice
 * Manages categories state with multi-language support
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Language } from '~/lib/i18n/types';

// Raw category from API with both languages
export interface Category {
  id: string;
  slug: string;
  name_es: string;
  description_es?: string;
  name_en: string;
  description_en?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Translated category for display
export interface TranslatedCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Translation helper functions
export function translateCategory(category: Category, lang: Language): TranslatedCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: lang === 'es' ? category.name_es : category.name_en,
    description: lang === 'es' ? category.description_es : category.description_en,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function translateCategories(categories: Category[], lang: Language): TranslatedCategory[] {
  return categories.map((cat) => translateCategory(cat, lang));
}

interface CategoriesState {
  categories: Category[];
  selectedCategory: Category | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  categories: [],
  selectedCategory: null,
  isLoading: false,
  error: null,
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    fetchCategoriesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchCategoriesSuccess: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchCategoriesFailure: (state, action: PayloadAction<string>) => {
      state.categories = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    addCategory: (state, action: PayloadAction<Category>) => {
      state.categories.push(action.payload);
    },
    updateCategory: (state, action: PayloadAction<Category>) => {
      const index = state.categories.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    },
    deleteCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter((c) => c.id !== action.payload);
    },
    setSelectedCategory: (state, action: PayloadAction<Category | null>) => {
      state.selectedCategory = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchCategoriesStart,
  fetchCategoriesSuccess,
  fetchCategoriesFailure,
  addCategory,
  updateCategory,
  deleteCategory,
  setSelectedCategory,
  clearError,
} = categoriesSlice.actions;

// Selectors
export const selectCategories = (state: { category: CategoriesState }): Category[] =>
  state.category.categories;
export const selectSelectedCategory = (state: { category: CategoriesState }): Category | null =>
  state.category.selectedCategory;
export const selectCategoriesLoading = (state: { category: CategoriesState }): boolean =>
  state.category.isLoading;
export const selectCategoriesError = (state: { category: CategoriesState }): string | null =>
  state.category.error;

export default categoriesSlice.reducer;
