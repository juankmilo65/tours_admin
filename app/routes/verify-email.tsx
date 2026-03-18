/**
 * Verify Email Route - Email Verification Page
 * This page verifies email using a token from URL
 * URL format: /verify-email?token=xyz
 */

import type { JSX } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { useAppDispatch } from '~/store/hooks';
import { useTranslation } from '~/lib/i18n/utils';
import { verifyEmailToken } from '~/server/auth';
import { logout } from '~/store/slices/authSlice';

export function loader(): Promise<null> {
  // No authentication required - users can verify email even if not logged in
  return Promise.resolve(null);
}

export default function VerifyEmail(): JSX.Element {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  // Get token from URL
  const token = searchParams.get('token');

  // State
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  // Check if token exists on mount
  useEffect(() => {
    if (token === null || token === undefined || token.trim() === '') {
      setError(t('verifyEmail.invalidToken') ?? 'Invalid or missing verification token');
    }
  }, [token, t]);

  const handleVerifyEmail = async () => {
    if (token === null || token === undefined || token.trim() === '') {
      setError(t('verifyEmail.invalidToken') ?? 'Invalid verification token');
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      const result = await verifyEmailToken({ token }, language);

      if (result.success === true) {
        setIsVerified(true);
      } else {
        // Extract error message
        let errorMessage = t('verifyEmail.error') ?? 'Failed to verify email';

        if (result.error !== null && result.error !== undefined) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.error instanceof Error) {
            errorMessage = result.error.message;
          } else if (
            typeof result.error === 'object' &&
            'message' in result.error &&
            result.error.message !== undefined
          ) {
            errorMessage = result.error.message as string;
          }
        }

        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error verifying email:', err);
      setError(
        err instanceof Error ? err.message : (t('verifyEmail.error') ?? 'Failed to verify email')
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoToLogin = () => {
    // Clear auth state and redirect to login
    dispatch(logout());
    navigate('/', { replace: true });
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg
      className="animate-spin"
      style={{
        width: '20px',
        height: '20px',
        animation: 'spin 1s linear infinite',
      }}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        style={{ opacity: '0.25' }}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        style={{ opacity: '0.75' }}
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Check if token is missing
  if (token === null || token === undefined || token.trim() === '') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-neutral-50)',
        }}
      >
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <Card>
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-6)',
              }}
            >
              {/* Error Icon */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-6)',
                }}
              >
                <svg
                  style={{ width: '40px', height: '40px', color: '#ef4444' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Error Title */}
              <h1
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-neutral-900)',
                  margin: '0 0 var(--space-2) 0',
                }}
              >
                {t('verifyEmail.invalidToken') ?? 'Invalid Link'}
              </h1>

              {/* Error Message */}
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-neutral-600)',
                  margin: '0 0 var(--space-6) 0',
                  lineHeight: '1.6',
                }}
              >
                {t('verifyEmail.missingToken') ??
                  'The verification link is invalid or has expired. Please request a new verification email.'}
              </p>

              {/* Go to Login Button */}
              <Button variant="primary" onClick={handleGoToLogin} style={{ width: '100%' }}>
                {t('verifyEmail.loginButton') ?? 'Go to Login'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--color-neutral-50)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
        }}
      >
        {!isVerified ? (
          <Card>
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-6)',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-6)',
                }}
              >
                <svg
                  style={{ width: '40px', height: '40px', color: '#2563eb' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-neutral-900)',
                  margin: '0 0 var(--space-2) 0',
                }}
              >
                {t('verifyEmail.title') ?? 'Verify Your Email'}
              </h1>

              {/* Description */}
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-neutral-600)',
                  margin: '0 0 var(--space-6) 0',
                  lineHeight: '1.6',
                }}
              >
                {t('verifyEmail.tokenDescription') ??
                  'Click the button below to verify your email address.'}
              </p>

              {/* Error Message */}
              {error !== '' && (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)',
                    color: '#dc2626',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <p style={{ margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Verify Button */}
              <Button
                variant="primary"
                onClick={() => void handleVerifyEmail()}
                disabled={isVerifying}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                {isVerifying ? (
                  <>
                    <LoadingSpinner />
                    <span>{t('verifyEmail.verifying') ?? 'Verifying...'}</span>
                  </>
                ) : (
                  (t('verifyEmail.verifyButton') ?? 'Verify Email')
                )}
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-6)',
              }}
            >
              {/* Success Icon */}
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-6)',
                }}
              >
                <svg
                  style={{ width: '40px', height: '40px', color: '#10b981' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              {/* Success Title */}
              <h1
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-neutral-900)',
                  margin: '0 0 var(--space-2) 0',
                }}
              >
                {t('verifyEmail.verifiedTitle') ?? 'Email Verified'}
              </h1>

              {/* Success Message */}
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-neutral-600)',
                  margin: '0 0 var(--space-6) 0',
                  lineHeight: '1.6',
                }}
              >
                {t('verifyEmail.verifiedMessage') ??
                  'Your email has been successfully verified. You can now log in to your account.'}
              </p>

              {/* Login Button */}
              <Button variant="primary" onClick={handleGoToLogin} style={{ width: '100%' }}>
                {t('verifyEmail.loginButton') ?? 'Go to Login'}
              </Button>
            </div>
          </Card>
        )}

        {/* Back to Login Link */}
        {!isVerified && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              onClick={handleGoToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-neutral-600)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
              }}
            >
              <svg
                style={{ width: '16px', height: '16px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t('verifyEmail.backToLogin') ?? 'Back to Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
