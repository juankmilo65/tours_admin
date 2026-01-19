/**
 * Login Route (/)
 * Modern login page with 2 column layout and 2-step wizard (Login + OTP)
 */

import type { JSX, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link, type MetaFunction } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireNoAuth } from '~/utilities/auth.loader';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import {
  loginUserBusinessLogic,
  requestEmailVerificationBusinessLogic,
  verifyEmailBusinessLogic,
} from '~/server/businessLogic/authBusinessLogic';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  requestOtpStart,
  requestOtpSuccess,
  requestOtpFailure,
  verifyOtpStart,
  verifyOtpSuccess,
  verifyOtpFailure,
  selectIsAuthenticated,
  selectPendingEmail,
  selectOtpSent,
  selectRequiresOtp,
  selectAuthToken,
  selectAuthError,
  clearError,
} from '~/store/slices/authSlice';
import { setGlobalLoading, setLanguage } from '~/store/slices/uiSlice';
import Select from '~/components/ui/Select';
import { useTranslation } from '~/lib/i18n/utils';
import type { Language } from '~/lib/i18n/types';

export const meta: MetaFunction = () => {
  return [
    { title: 'Login - Tours Admin' },
    { name: 'description', content: 'Login to Tours Admin Dashboard' },
  ];
};

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireNoAuth(args);
  return null;
}

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

// Helper function to extract error message from various error formats
const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    // Check if it's an Axios error with response
    const axiosError = error as { response?: { data?: unknown } };
    if (axiosError.response?.data !== undefined && axiosError.response?.data !== null) {
      const data = axiosError.response.data;

      // Try different possible error message properties
      if (typeof data === 'string') {
        return data;
      }

      if (typeof data === 'object' && data !== null) {
        const possibleKeys = ['error', 'message', 'msg', 'detail', 'description'] as const;
        for (const key of possibleKeys) {
          const value = (data as Record<string, unknown>)[key];
          if (value !== undefined && value !== null && typeof value === 'string') {
            return value;
          }
        }
      }
    }

    // Fallback to error message
    return error.message || 'Error de autenticación';
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return 'Error desconocido';
};

export default function IndexRoute(): JSX.Element {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const requiresOtp = useAppSelector(selectRequiresOtp);
  const { t, language: currentLang } = useTranslation();
  const otpEmail = useAppSelector(selectPendingEmail);
  const otpSent = useAppSelector(selectOtpSent);
  const authToken = useAppSelector(selectAuthToken);
  const authError = useAppSelector(selectAuthError);

  // Wizard step: 'login' or 'otp'
  const [step, setStep] = useState<'login' | 'otp'>('login');

  // Update step based on requiresOtp state
  useEffect(() => {
    if (requiresOtp === true && otpEmail !== null) {
      setStep('otp');
      // Clear any previous login errors when moving to OTP step
      dispatch(clearError());
    } else if (requiresOtp === false) {
      setStep('login');
    }
  }, [requiresOtp, otpEmail, dispatch]);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP form state
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Clear error when user changes credentials
  useEffect(() => {
    if (authError !== null && (email.trim() !== '' || password.trim() !== '')) {
      dispatch(clearError());
    }
  }, [email, password, authError, dispatch]);

  // Clear error when user changes OTP code
  useEffect(() => {
    if (authError !== null && otpCode.trim() !== '') {
      dispatch(clearError());
    }
  }, [otpCode, authError, dispatch]);

  // Password Visibility Logic
  const [passLocked, setPassLocked] = useState(false);
  const [passHover, setPassHover] = useState(false);
  const showPassword = passLocked || passHover;

  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Handle login form submission
  const handleLoginSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    dispatch(clearError());

    if (!email || !password) {
      dispatch(loginFailure(t('auth.errorIncomplete')));
      return;
    }

    setIsLoading(true);
    dispatch(loginStart());
    dispatch(setGlobalLoading({ isLoading: true, message: t('auth.loggingIn') }));

    try {
      const result = await loginUserBusinessLogic({ email, password });

      if (result.success === true && result.data) {
        // Login successful, save to Redux
        dispatch(
          loginSuccess({
            user: result.data.user as never,
            token: result.data.token,
          })
        );

        // Request OTP for 2FA
        await requestOtpCode(email);
      } else {
        // Extract error message from various possible formats
        const errorMessage = extractErrorMessage(result.error);

        dispatch(loginFailure(errorMessage));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.errorGenericLogin');
      dispatch(loginFailure(errorMessage));
    } finally {
      setIsLoading(false);
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

  // Request OTP code
  const requestOtpCode = async (userEmail: string): Promise<void> => {
    dispatch(requestOtpStart(userEmail));

    try {
      const result = await requestEmailVerificationBusinessLogic({ email: userEmail });

      if (result.success === true) {
        dispatch(requestOtpSuccess());
        // Move to OTP step
        setStep('otp');
      } else {
        const errorMessage =
          extractErrorMessage(result.error) ?? result.message ?? t('auth.errorGenericLogin');
        dispatch(requestOtpFailure(errorMessage));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.errorGenericLogin');
      dispatch(requestOtpFailure(errorMessage));
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    dispatch(clearError());

    if (otpCode?.length !== 6) {
      dispatch(verifyOtpFailure(t('auth.invalidOtp')));
      return;
    }

    setIsVerifying(true);
    dispatch(verifyOtpStart());
    dispatch(setGlobalLoading({ isLoading: true, message: t('auth.verifying') }));

    try {
      const result = await verifyEmailBusinessLogic(
        { otp: otpCode, email: otpEmail ?? '' },
        authToken ?? ''
      );

      if (result.success === true) {
        dispatch(verifyOtpSuccess());
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        // Extract error message from various possible formats
        const errorMessage = extractErrorMessage(result.error) || t('auth.invalidOtp');

        dispatch(verifyOtpFailure(errorMessage));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.errorGenericOtp');
      dispatch(verifyOtpFailure(errorMessage));
    } finally {
      setIsVerifying(false);
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

  // Go back to login step
  const handleBackToLogin = (): void => {
    setStep('login');
    setOtpCode('');
    dispatch(clearError());
  };

  // Resend OTP code
  const handleResendOtp = async (): Promise<void> => {
    if (otpEmail !== null && otpEmail !== undefined) {
      await requestOtpCode(otpEmail);
      setOtpCode('');
      dispatch(clearError());
    }
  };

  const handleLanguageChange = (value: string): void => {
    dispatch(setLanguage(value as Language));
  };

  // Icons
  const EyeIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  const EyeOffIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.68 0 1.35-.06 1.99-.17" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
  const ArrowLeftIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-decoration-1" />
        <div className="login-decoration-2" />

        <div className="login-branding">
          <div className="login-title">🏛️ {t('auth.title')}</div>
          <p className="login-subtitle">{t('auth.subtitle')}</p>

          <div className="login-image">
            <img src="/login_tours_image.png" alt="Tours illustration" />
          </div>
        </div>
      </div>

      <div className="login-right">
        {/* Language Selector */}
        <div className="auth-lang-selector">
          <div style={{ width: '140px' }}>
            <Select
              options={LANGUAGES}
              value={currentLang}
              onChange={handleLanguageChange}
              className="select-compact"
            />
          </div>
        </div>

        <div className="login-form-container">
          <h1 className="login-heading">
            {step === 'login' ? t('auth.welcome') : t('auth.otpTitle')}
          </h1>
          <p className="login-description">
            {step === 'login' ? t('auth.welcomeSub') : `${t('auth.otpDescription')} ${otpEmail}`}
          </p>

          {/* Step Indicator */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-6)',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor:
                    step === 'login' ? 'var(--color-primary-600)' : 'var(--color-primary-100)',
                  color: step === 'login' ? 'white' : 'var(--color-primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                1
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: step === 'login' ? '600' : '400',
                  color: step === 'login' ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)',
                }}
              >
                {t('auth.login')}
              </span>
            </div>
            <div
              style={{ width: '24px', height: '2px', backgroundColor: 'var(--color-neutral-300)' }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor:
                    step === 'otp' ? 'var(--color-primary-600)' : 'var(--color-primary-100)',
                  color: step === 'otp' ? 'white' : 'var(--color-primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                2
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: step === 'otp' ? '600' : '400',
                  color: step === 'otp' ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)',
                }}
              >
                {t('auth.otpTitle')}
              </span>
            </div>
          </div>

          {/* Login Step */}
          {step === 'login' ? (
            <form
              onSubmit={(e) => {
                void handleLoginSubmit(e);
              }}
              className="login-form"
            >
              <div className="form-field">
                <label htmlFor="email" className="form-label">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  disabled={isLoading}
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label htmlFor="password" className="form-label">
                  {t('auth.password')}
                </label>
                <div className="password-input-container">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setPassLocked(!passLocked)}
                    onMouseEnter={() => setPassHover(true)}
                    onMouseLeave={() => setPassHover(false)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title="Click to toggle, hover to peek"
                  >
                    {showPassword ? EyeOffIcon : EyeIcon}
                  </button>
                </div>
              </div>

              {authError !== null && (
                <div className="error-message">
                  <p>{authError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`submit-button ${isLoading ? 'loading' : ''}`}
              >
                {isLoading ? t('auth.loggingIn') : t('auth.login')}
              </button>
            </form>
          ) : (
            /* OTP Step */
            <form
              onSubmit={(e) => {
                void handleOtpSubmit(e);
              }}
              className="login-form"
            >
              <div className="form-field">
                <label htmlFor="otp" className="form-label">
                  {t('auth.otpLabel')}
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    // Only allow numbers, max 6 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(value);
                  }}
                  placeholder={t('auth.otpPlaceholder')}
                  disabled={isVerifying}
                  className="form-input"
                  style={{
                    fontSize: '24px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontWeight: '600',
                  }}
                  maxLength={6}
                />
              </div>

              {authError !== null && (
                <div className="error-message">
                  <p>{authError}</p>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <button
                  type="submit"
                  disabled={isVerifying}
                  className={`submit-button ${isVerifying ? 'loading' : ''}`}
                >
                  {isVerifying ? t('auth.verifying') : t('auth.verifyOtp')}
                </button>

                {otpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleResendOtp();
                    }}
                    disabled={isVerifying}
                    style={{
                      padding: 'var(--space-2)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-primary-600)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: isVerifying ? 'not-allowed' : 'pointer',
                      fontSize: 'var(--text-sm)',
                      fontWeight: '500',
                    }}
                  >
                    {t('auth.resendOtp')}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Back button for OTP step */}
          {step === 'otp' && (
            <button
              type="button"
              onClick={handleBackToLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) 0',
                backgroundColor: 'transparent',
                color: 'var(--color-neutral-600)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                marginTop: 'var(--space-4)',
              }}
            >
              {ArrowLeftIcon}
              {t('common.back')}
            </button>
          )}

          {/* Register link - only show on login step */}
          {step === 'login' && (
            <div className="register-link">
              <p>
                {t('auth.registerPrompt')}{' '}
                <Link to="/register" className="link">
                  {t('auth.registerLink')}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
