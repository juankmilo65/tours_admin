/**
 * Verify Email Route - Email Verification Page
 */

import type { JSX } from 'react';
import { useNavigate } from '@remix-run/react';
import { useState } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { selectAuthToken, logout } from '~/store/slices/authSlice';
import { useAppSelector } from '~/store/hooks';
import { verifyEmail } from '~/server/auth';

export function loader(): Promise<null> {
  // No authentication required - users can verify email even if not logged in
  return Promise.resolve(null);
}

export default function VerifyEmail(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);

  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyEmail = async () => {
    if (!otp || otp.trim() === '') {
      setError(t('verifyEmail.otpRequired') ?? 'Please enter the verification code');
      return;
    }

    if (otp.length !== 6) {
      setError(t('verifyEmail.otpInvalidLength') ?? 'The code must be 6 digits');
      return;
    }

    setError('');

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('verifyEmail.verifying') ?? 'Verifying...',
        })
      );

      const result = await verifyEmail(
        { otp, email: '' }, // Email will be handled by backend if needed
        token ?? ''
      );

      if (result.success === true) {
        setIsVerified(true);
      } else {
        setError(result.message ?? t('verifyEmail.error') ?? 'Failed to verify email');
      }
    } catch (err) {
      console.error('Error verifying email:', err);
      setError(
        err instanceof Error ? err.message : (t('verifyEmail.error') ?? 'Failed to verify email')
      );
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  const handleGoToLogin = () => {
    // Clear auth state and redirect to login
    dispatch(logout());
    navigate('/login', { replace: true });
  };

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
                {t('verifyEmail.description') ??
                  'We have sent a 6-digit verification code to your email address. Please enter it below to verify your email.'}
              </p>

              {/* OTP Input */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Input
                  label={t('verifyEmail.otpLabel') ?? 'Verification Code'}
                  placeholder="123456"
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    // Only allow numbers, max 6 digits
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtp(value);
                    setError('');
                  }}
                  maxLength={6}
                  error={error}
                  required
                  autoFocus
                  style={{
                    fontSize: 'var(--text-xl)',
                    letterSpacing: '0.5em',
                    textAlign: 'center',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                />
              </div>

              {/* Verify Button */}
              <Button
                variant="primary"
                onClick={() => void handleVerifyEmail()}
                style={{ width: '100%', marginBottom: 'var(--space-3)' }}
              >
                {t('verifyEmail.verifyButton') ?? 'Verify Email'}
              </Button>

              {/* Resend Code */}
              <button
                type="button"
                onClick={() => {
                  // TODO: Implement resend OTP functionality
                  // eslint-disable-next-line no-console
                  console.log('Resend OTP');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary-600)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  padding: 'var(--space-2)',
                }}
              >
                {t('verifyEmail.resendCode') ?? "Didn't receive code? Resend"}
              </button>
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
