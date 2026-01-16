/**
 * LogoutModal Component
 * Full-screen logout confirmation modal that blocks all interactions
 */

/* global fetch */

import type { JSX } from 'react';
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectShowLogoutModal, setLogoutModal } from '~/store/slices/uiSlice';
import {
  logout as logoutAction,
  selectAuthToken,
  selectIsAuthenticated,
} from '~/store/slices/authSlice';
import { useTranslation } from '~/lib/i18n/utils';

export function LogoutModal(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showModal = useAppSelector(selectShowLogoutModal);
  const authToken = useAppSelector(selectAuthToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!showModal) {
    return null;
  }

  /**
   * Handle logout process
   * Follows the architecture: Component → API Route → authBusinessLogic → auth → createServiceREST → Backend
   */
  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);

    try {
      // Step 1: Check if user is authenticated and has token
      if (
        isAuthenticated &&
        authToken !== null &&
        authToken !== undefined &&
        authToken.trim() !== ''
      ) {
        console.log('LogoutModal - Token found, calling /api/auth/logout');

        // Step 2: Call backend API via /api/auth/logout route
        const formData = new FormData();
        formData.append('action', 'logoutUserBusinessLogic');
        formData.append('token', authToken);

        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          body: formData,
        });

        console.log('LogoutModal - /api/auth/logout response status:', response.status);

        // Step 3: Check if backend logout was successful
        if (!response.ok && response.status !== 401) {
          console.warn(
            'LogoutModal - Backend logout failed, but continuing with local logout, status:',
            response.status
          );
        }
      } else {
        console.log('LogoutModal - No token found, proceeding with local logout only');
      }

      // Step 4: Always clear Redux state (local logout)
      dispatch(logoutAction());

      // Step 5: Close modal
      dispatch(setLogoutModal(false));

      // Step 6: Force full page reload to clear any remaining session data
      window.location.href = '/';
    } catch (error) {
      console.error('LogoutModal - Logout error:', error);

      // Even on error, clear local state
      dispatch(logoutAction());
      dispatch(setLogoutModal(false));

      // Force full page reload to clear server session
      window.location.href = '/';
    } finally {
      // Don't set logging out to false since we're reloading the page
      // setIsLoggingOut(false);
    }
  };

  /**
   * Close the modal without logging out
   */
  const handleClose = (): void => {
    dispatch(setLogoutModal(false));
  };

  /**
   * Handle logout button click with error handling
   */
  const handleLogoutClick = (): void => {
    handleLogout().catch(console.error);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          maxWidth: '400px',
          width: '90%',
          boxShadow: 'var(--shadow-lg)',
          pointerEvents: 'auto',
        }}
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-lg)',
            fontWeight: '600',
            color: 'var(--color-neutral-900)',
          }}
        >
          {t('auth.logoutConfirmTitle')}
        </h3>
        <p
          style={{
            marginBottom: 'var(--space-6)',
            color: 'var(--color-neutral-700)',
            lineHeight: 1.5,
          }}
        >
          {t('auth.logoutConfirmMessage')}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleClose}
            disabled={isLoggingOut}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--color-neutral-200)',
              color: 'var(--color-neutral-700)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: isLoggingOut ? 'not-allowed' : 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: '500',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--color-error-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: isLoggingOut ? 'not-allowed' : 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: '500',
            }}
          >
            {isLoggingOut ? t('auth.loggingOut') : t('auth.logoutConfirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
