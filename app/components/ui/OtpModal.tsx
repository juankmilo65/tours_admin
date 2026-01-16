/**
 * OTP Modal Component
 * Modal for entering One-Time Password (OTP) during 2FA authentication
 */

/* global setTimeout, localStorage */
/* eslint-disable @typescript-eslint/no-misused-promises */

import type { JSX } from 'react';
import React, { useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import {
  selectRequiresOtp,
  selectPendingEmail,
  verifyOtpStart,
  verifyOtpSuccess,
  verifyOtpFailure,
  clearOtpState,
  selectAuthToken,
} from '~/store/slices/authSlice';
import { requestEmailVerificationBusinessLogic } from '~/server/businessLogic/authBusinessLogic';
import { useTranslation } from '~/lib/i18n/utils';

// Type definition for API response
type VerifyEmailApiResponse = {
  success?: boolean;
  message?: string;
  error?: string | { message?: string };
};

export function OtpModal(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const showModal = useAppSelector(selectRequiresOtp);
  const pendingEmail = useAppSelector(selectPendingEmail);
  const authToken = useAppSelector(selectAuthToken);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!showModal) {
    return null;
  }

  const handleVerifyOtp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!otp || otp.trim() === '') {
      return;
    }

    setIsLoading(true);
    dispatch(verifyOtpStart());

    console.log('OtpModal - Starting OTP verification');
    console.log('OtpModal - authToken from Redux:', authToken);
    console.log('OtpModal - pendingEmail:', pendingEmail);

    try {
      // Call API route to verify OTP (this will sync with session)
      const response = await window.fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use token from Authorization header
          Authorization: `Bearer ${authToken ?? ''}`,
        },
        body: JSON.stringify({
          otp: otp.trim(),
          email: pendingEmail ?? '',
        }),
      });

      console.log('OtpModal - Response status:', response.status);
      const result = (await response.json()) as VerifyEmailApiResponse;
      console.log('OtpModal - Response:', result);

      if (response.ok && result.success === true) {
        // OTP verified successfully - session is now synced on server
        console.log('OtpModal - OTP verified successfully, dispatching verifyOtpSuccess');
        dispatch(verifyOtpSuccess());

        // Check Redux state after dispatch
        setTimeout(() => {
          console.log('OtpModal - Redux state after verifyOtpSuccess');
          console.log('OtpModal - token from localStorage:', localStorage.getItem('authToken'));
        }, 100);

        // Navigate to dashboard WITHOUT page reload (preserves Redux state)
        console.log('OtpModal - Navigating to dashboard');
        navigate('/dashboard');
      } else {
        let errorMessage = t('auth.invalidOtp');
        if (result.error !== null && result.error !== undefined) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.error.message !== undefined) {
            errorMessage = result.error.message;
          } else if (result.message !== undefined) {
            errorMessage = result.message;
          }
        }
        dispatch(verifyOtpFailure(errorMessage));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.errorGenericOtp');
      dispatch(verifyOtpFailure(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (): void => {
    dispatch(clearOtpState());
  };

  const handleResendOtp = (): void => {
    if (pendingEmail !== null && pendingEmail !== undefined && pendingEmail !== '') {
      requestEmailVerificationBusinessLogic({ email: pendingEmail })
        .then(() => {
          console.log('OTP resent successfully');
        })
        .catch((error) => {
          console.error('Error resending OTP:', error);
        });
    }
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
          maxWidth: '450px',
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
          {t('auth.otpTitle')}
        </h3>
        <p
          style={{
            marginBottom: 'var(--space-6)',
            color: 'var(--color-neutral-700)',
            lineHeight: 1.5,
            fontSize: 'var(--text-sm)',
          }}
        >
          {t('auth.otpDescription')}{' '}
          {pendingEmail !== null && pendingEmail !== undefined && pendingEmail.length > 0 ? (
            <strong>{pendingEmail}</strong>
          ) : null}
        </p>

        <form onSubmit={handleVerifyOtp}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="otp"
              style={{
                display: 'block',
                marginBottom: 'var(--space-2)',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('auth.otpLabel')}
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
              }}
              placeholder={t('auth.otpPlaceholder')}
              disabled={isLoading}
              maxLength={6}
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                border: '1px solid var(--color-neutral-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-lg)',
                letterSpacing: '0.5em',
                textAlign: 'center',
                outline: 'none',
                cursor: isLoading ? 'not-allowed' : 'text',
              }}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'flex-end',
              marginBottom: 'var(--space-4)',
            }}
          >
            <button
              type="button"
              onClick={(): void => {
                handleResendOtp();
              }}
              disabled={isLoading}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'transparent',
                color: 'var(--color-primary-500)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                textDecoration: 'underline',
              }}
            >
              {t('auth.resendOtp')}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-neutral-200)',
                color: 'var(--color-neutral-700)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-primary-500)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: isLoading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
              }}
            >
              {isLoading ? t('auth.verifying') : t('auth.verifyOtp')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
