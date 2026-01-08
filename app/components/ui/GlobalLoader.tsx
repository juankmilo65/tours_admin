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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: '56px',
          height: '56px',
          border: '4px solid var(--color-neutral-200)',
          borderTopColor: 'var(--color-primary-500)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: 'var(--space-4)',
        }}
      />

      {/* Loading message */}
      {message !== undefined && (
        <p
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-neutral-700)',
            textAlign: 'center',
            maxWidth: '300px',
          }}
        >
          {message}
        </p>
      )}

      {/* Default message if none provided */}
      {message === undefined && (
        <p
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-neutral-500)',
          }}
        >
          {t('common.loading')}
        </p>
      )}
    </div>
  );
}
