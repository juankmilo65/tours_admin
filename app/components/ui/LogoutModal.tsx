/**
 * LogoutModal Component
 * Full-screen logout confirmation modal that blocks all interactions
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectShowLogoutModal, setLogoutModal } from '~/store/slices/uiSlice';
import { logout as logoutAction, selectAuthToken } from '~/store/slices/authSlice';
import { useTranslation } from '~/lib/i18n/utils';

// Declare fetch for ESLint
declare const fetch: typeof globalThis.fetch;

export function LogoutModal(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const showModal = useAppSelector(selectShowLogoutModal);
  const authToken = useAppSelector(selectAuthToken);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!showModal) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      // The server will get the token from the session cookie
      // No need to send token from Redux - server handles it
      const formData = new FormData();
      formData.append('action', 'logoutUserBusinessLogic');
      if (authToken !== null && authToken !== undefined && authToken.trim() !== '') {
        formData.append('token', authToken);
      }

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Clear Redux state
        dispatch(logoutAction());
        // Close modal
        dispatch(setLogoutModal(false));
        // Force full page reload to clear server session
        window.location.href = '/';
      } else {
        console.error('Logout failed');
        // Still close modal and logout locally
        dispatch(logoutAction());
        dispatch(setLogoutModal(false));
        // Force full page reload to clear server session
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout locally on error
      dispatch(logoutAction());
      dispatch(setLogoutModal(false));
      // Force full page reload to clear server session
      window.location.href = '/';
    } finally {
      // Don't set logging out to false since we're reloading
      // setIsLoggingOut(false);
    }
  };

  const handleClose = () => {
    dispatch(setLogoutModal(false));
  };

  const handleLogoutClick = () => {
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
        onClick={(e) => e.stopPropagation()}
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
