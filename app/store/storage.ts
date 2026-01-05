/**
 * Storage wrapper for Redux Persist
 * Handles SSR by checking if we're in browser
 */

import createWebStorage from 'redux-persist/lib/storage/createWebStorage';

// Create a noop storage for SSR
const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

// Use localStorage if available (browser), otherwise use noop storage (SSR)
const storage =
  typeof window !== 'undefined'
    ? createWebStorage('local')
    : createNoopStorage();

export default storage;
