/**
 * useErrorHandler Hook
 * Centralized error handling with Redux notifications
 */

import { useCallback } from 'react';
import { useAppDispatch } from '~/store/hooks';
import { addNotification } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n';

interface ErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
}

export const useErrorHandler = (
  options: ErrorHandlerOptions = {}
): { handleError: (error: unknown, context?: string) => string } => {
  const { showNotification = true, logToConsole = true } = options;
  const dispatch = useAppDispatch();
  const { language } = useTranslation();

  const handleError = useCallback(
    (error: unknown, context?: string) => {
      let message: string;

      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else {
        message =
          language === 'en' ? 'An unexpected error occurred' : 'Ocurrió un error inesperado';
      }

      if (logToConsole) {
        console.error(`[${context ?? 'Error'}]:`, error);
      }

      if (showNotification) {
        dispatch(
          addNotification({
            id: `error-${Date.now()}`,
            type: 'error',
            message,
            duration: 5000,
          })
        );
      }

      return message;
    },
    [dispatch, language, showNotification, logToConsole]
  );

  return { handleError };
};
