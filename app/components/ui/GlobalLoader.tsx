/**
 * GlobalLoader Component
 * Full-screen loading overlay for transversal operations
 * (country change, navigation, API calls outside current view)
 */

import type { JSX } from 'react';
import { useAppSelector } from '~/store/hooks';
import { selectIsGlobalLoading, selectGlobalLoadingMessage } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';

export function GlobalLoader(): JSX.Element | null {
  const isLoading = useAppSelector(selectIsGlobalLoading);
  const message = useAppSelector(selectGlobalLoadingMessage);
  const { t } = useTranslation();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Modern Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        {/* Loading message */}
        {message !== undefined && (
          <p className="text-lg font-medium text-gray-700 text-center max-w-md px-4">{message}</p>
        )}

        {/* Default message if none provided */}
        {message === undefined && <p className="text-base text-gray-500">{t('common.loading')}</p>}

        {/* Subtle animation indicator */}
        <div className="flex items-center space-x-1 mt-2">
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
