/**
 * News Slice
 * Manages news state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface News {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  imageUrl?: string;
  author: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface NewsState {
  news: News[];
  selectedNews: News | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: NewsState = {
  news: [],
  selectedNews: null,
  isLoading: false,
  error: null,
};

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    fetchNewsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchNewsSuccess: (state, action: PayloadAction<News[]>) => {
      state.news = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    fetchNewsFailure: (state, action: PayloadAction<string>) => {
      state.news = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    addNews: (state, action: PayloadAction<News>) => {
      state.news.push(action.payload);
    },
    updateNews: (state, action: PayloadAction<News>) => {
      const index = state.news.findIndex((n) => n.id === action.payload.id);
      if (index !== -1) {
        state.news[index] = action.payload;
      }
    },
    deleteNews: (state, action: PayloadAction<string>) => {
      state.news = state.news.filter((n) => n.id !== action.payload);
    },
    setSelectedNews: (state, action: PayloadAction<News | null>) => {
      state.selectedNews = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchNewsStart,
  fetchNewsSuccess,
  fetchNewsFailure,
  addNews,
  updateNews,
  deleteNews,
  setSelectedNews,
  clearError,
} = newsSlice.actions;
export default newsSlice.reducer;
