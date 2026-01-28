/**
 * Login Route (/)
 * Modern login page with 2 column layout and 2-step wizard (Login + OTP)
 */

import type { JSX, FormEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, type MetaFunction } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireNoAuth } from '~/utilities/auth.loader';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import {
  loginUserBusinessLogic,
  requestEmailVerificationBusinessLogic,
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
  clearOtpState,
  selectIsAuthenticated,
  selectPendingEmail,
  selectOtpSent,
  selectRequiresOtp,
  selectPendingToken,
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

export default function IndexRoute(): JSX.Element {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const requiresOtp = useAppSelector(selectRequiresOtp);
  const { t, language: currentLang } = useTranslation();
  const otpEmail = useAppSelector(selectPendingEmail);
  const otpSent = useAppSelector(selectOtpSent);
  const authToken = useAppSelector(selectPendingToken);

  // Wizard step: 'login', 'otp', or 'forgot-password'
  const [step, setStep] = useState<'login' | 'otp' | 'forgot-password'>('login');
  // Ref to prevent auto-redirect when user clicks back button
  const isNavigatingBackRef = useRef(false);

  // Update step based on requiresOtp state
  useEffect(() => {
    if (
      !isNavigatingBackRef.current &&
      requiresOtp === true &&
      otpEmail !== null &&
      step !== 'forgot-password'
    ) {
      setStep('otp');
    } else if (!isNavigatingBackRef.current && requiresOtp === false && step === 'otp') {
      setStep('login');
    }
  }, [requiresOtp, otpEmail, step]);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password Visibility Logic
  const [passLocked, setPassLocked] = useState(false);
  const [passHover, setPassHover] = useState(false);
  const showPassword = passLocked || passHover;

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // OTP form state
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Handle login form submission
  const handleLoginSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t('auth.errorIncomplete'));
      return;
    }

    setIsLoading(true);
    dispatch(loginStart());
    dispatch(setGlobalLoading({ isLoading: true, message: t('auth.loggingIn') }));

    try {
      const result = await loginUserBusinessLogic({ email, password });

      if (result.success === true && result.data) {
        // Login successful, save to Redux
        // Note: Backend returns 'accessToken', not 'token'
        dispatch(
          loginSuccess({
            user: result.data.user as never,
            token: result.data.accessToken,
          })
        );

        // Request OTP for 2FA
        await requestOtpCode(email);
      } else {
        // Extract error message from various possible formats
        let errorMessage: string = t('auth.errorGenericLogin');

        if (result.error !== null && result.error !== undefined) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.error instanceof Error) {
            // Handle Axios error
            const axiosError = result.error as { response?: { data?: unknown } };
            if (
              axiosError.response?.data !== undefined &&
              typeof axiosError.response.data === 'object'
            ) {
              const data = axiosError.response.data as Record<string, unknown>;
              if (data.error !== undefined && typeof data.error === 'string') {
                errorMessage = data.error;
              } else if (data.message !== undefined && typeof data.message === 'string') {
                errorMessage = data.message;
              } else if (data.msg !== undefined && typeof data.msg === 'string') {
                errorMessage = data.msg;
              } else if (typeof axiosError.response.data === 'string') {
                errorMessage = axiosError.response.data;
              } else {
                // Try to find any string property that might contain the error
                const possibleKeys = ['error', 'message', 'msg', 'detail', 'description'];
                for (const key of possibleKeys) {
                  if (data[key] !== undefined && typeof data[key] === 'string') {
                    errorMessage = data[key];
                    break;
                  }
                }
              }
            } else if (result.error.message) {
              errorMessage = result.error.message;
            } else {
              errorMessage = 'Error de autenticación';
            }
          } else if (
            typeof result.error === 'object' &&
            'message' in result.error &&
            result.error.message !== undefined
          ) {
            errorMessage = result.error.message as string;
          } else {
            errorMessage = t('auth.errorGenericLogin');
          }
        }

        setError(errorMessage);
        dispatch(loginFailure(errorMessage));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.errorGenericLogin');
      setError(errorMessage);
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
        let errorMessage: string = t('auth.errorGenericLogin');
        if (result.error !== null && result.error !== undefined) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.error instanceof Error) {
            // Handle Axios error
            const axiosError = result.error as { response?: { data?: unknown } };
            if (
              axiosError.response?.data !== undefined &&
              typeof axiosError.response.data === 'object'
            ) {
              const data = axiosError.response.data as Record<string, unknown>;
              if (data.error !== undefined && typeof data.error === 'string') {
                errorMessage = data.error;
              } else if (data.message !== undefined && typeof data.message === 'string') {
                errorMessage = data.message;
              } else if (data.msg !== undefined && typeof data.msg === 'string') {
                errorMessage = data.msg;
              } else if (typeof axiosError.response.data === 'string') {
                errorMessage = axiosError.response.data;
              } else {
                // Try to find any string property that might contain the error
                const possibleKeys = ['error', 'message', 'msg', 'detail', 'description'];
                for (const key of possibleKeys) {
                  if (data[key] !== undefined && typeof data[key] === 'string') {
                    errorMessage = data[key];
                    break;
                  }
                }
              }
            } else if (result.error.message) {
              errorMessage = result.error.message;
            } else {
              errorMessage = 'Error de autenticación';
            }
          } else if (
            typeof result.error === 'object' &&
            'message' in result.error &&
            result.error.message !== undefined
          ) {
            errorMessage = result.error.message as string;
          } else {
            errorMessage = t('auth.errorGenericLogin');
          }
        }
        dispatch(requestOtpFailure(errorMessage));
        setError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.errorGenericLogin');
      dispatch(requestOtpFailure(errorMessage));
      setError(errorMessage);
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (otpCode?.length !== 6) {
      setError(t('auth.invalidOtp'));
      return;
    }

    setIsVerifying(true);
    dispatch(verifyOtpStart());
    dispatch(setGlobalLoading({ isLoading: true, message: t('auth.verifying') }));

    try {
      // Call to API endpoint to verify OTP and set server session
      // We use fetch to call the Remix route which handles:
      // 1) calling backend verifyEmail service, 2) setting server session cookie
      const response = await window.fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken ?? ''}`,
        },
        body: JSON.stringify({
          otp: otpCode,
          email: otpEmail ?? '',
        }),
      });

      const result = (await response.json()) as { success?: boolean; error?: string };

      if (response.ok && result.success === true) {
        dispatch(verifyOtpSuccess());
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        // Extract error message from response
        let errorMessage = t('auth.invalidOtp');

        if (result.error !== null && result.error !== undefined) {
          errorMessage = result.error;
        }

        setError(errorMessage);
        dispatch(verifyOtpFailure(errorMessage));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.errorGenericOtp');
      setError(errorMessage);
      dispatch(verifyOtpFailure(errorMessage));
    } finally {
      setIsVerifying(false);
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

  // Go back to login step
  const handleBackToLogin = (): void => {
    isNavigatingBackRef.current = true;
    setStep('login');
    setOtpCode('');
    setError(null);
    // Clear all OTP-related state from Redux to prevent auto-redirect back to OTP
    dispatch(clearOtpState());
    // Reset ref after a short delay
    window.setTimeout(() => {
      isNavigatingBackRef.current = false;
    }, 100);
  };

  // Handle forgot password submit
  const handleForgotPassword = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotEmail) {
      setForgotError(t('auth.errorIncomplete'));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError(t('validation.email'));
      return;
    }

    setIsSendingReset(true);
    dispatch(setGlobalLoading({ isLoading: true, message: t('auth.sendingResetLink') }));

    try {
      const { requestPasswordResetBusinessLogic } =
        await import('~/server/businessLogic/authBusinessLogic');

      // Type declaration for Vite environment variables
      interface ViteImportMetaEnv {
        readonly VITE_PASSWORD_RESET_URL?: string;
      }

      interface ViteImportMeta {
        readonly env: ViteImportMetaEnv;
      }

      const PASSWORD_RESET_URL =
        (import.meta as unknown as ViteImportMeta).env.VITE_PASSWORD_RESET_URL ?? '';

      const result = await requestPasswordResetBusinessLogic({
        email: forgotEmail,
        resetUrl: PASSWORD_RESET_URL,
      });

      if (result.success === true) {
        setForgotSuccess(true);
      } else {
        let errorMessage = t('auth.errorGenericLogin');

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
          } else {
            errorMessage = t('auth.errorGenericLogin');
          }
        } else {
          errorMessage = t('auth.errorGenericLogin');
        }

        setForgotError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.errorGenericLogin');
      setForgotError(errorMessage);
    } finally {
      setIsSendingReset(false);
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

  // Handle back to login from forgot password
  const handleBackFromForgotPassword = (): void => {
    setStep('login');
    setForgotEmail('');
    setForgotSuccess(false);
    setForgotError(null);
  };

  // Resend OTP code
  const handleResendOtp = async (): Promise<void> => {
    if (otpEmail !== null && otpEmail !== undefined) {
      await requestOtpCode(otpEmail);
      setOtpCode('');
      setError(null);
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
          {/* Only show heading and description if not in forgot-password success */}
          {!(step === 'forgot-password' && forgotSuccess) && (
            <>
              <h1 className="login-heading">
                {step === 'login'
                  ? t('auth.welcome')
                  : step === 'otp'
                    ? t('auth.otpTitle')
                    : t('auth.forgotPasswordTitle')}
              </h1>
              <p className="login-description">
                {step === 'login'
                  ? t('auth.welcomeSub')
                  : step === 'otp'
                    ? `${t('auth.otpDescription')} ${otpEmail}`
                    : t('auth.forgotPasswordDescription')}
              </p>
            </>
          )}

          {/* Step Indicator - Only show for login and OTP steps */}
          {step !== 'forgot-password' && (
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
                    color:
                      step === 'login' ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)',
                  }}
                >
                  {t('auth.login')}
                </span>
              </div>
              <div
                style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: 'var(--color-neutral-300)',
                }}
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
          )}

          {/* Login Step */}
          {step === 'login' && (
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
                    placeholder="•••••••"
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

              {error !== null && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}

              <div
                style={{
                  textAlign: 'right',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep('forgot-password')}
                  style={{
                    color: 'var(--color-primary-600)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: 'var(--text-sm)',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`submit-button ${isLoading ? 'loading' : ''}`}
              >
                {isLoading ? t('auth.loggingIn') : t('auth.login')}
              </button>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
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

              {error !== null && (
                <div className="error-message">
                  <p>{error}</p>
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

          {/* Forgot Password Step */}
          {step === 'forgot-password' && !forgotSuccess && (
            <form
              onSubmit={(e) => {
                void handleForgotPassword(e);
              }}
              className="login-form"
            >
              <div className="form-field">
                <label htmlFor="forgot-email" className="form-label">
                  {t('auth.email')}
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  disabled={isSendingReset}
                  className="form-input"
                  autoComplete="email"
                />
              </div>

              {forgotError !== null && (
                <div className="error-message">
                  <p>{forgotError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSendingReset}
                className={`submit-button ${isSendingReset ? 'loading' : ''}`}
              >
                {isSendingReset ? t('common.loading') : t('auth.sendResetLink')}
              </button>
            </form>
          )}

          {/* Forgot Password Success Message */}
          {step === 'forgot-password' && forgotSuccess && (
            <div className="success-message">
              <div
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-6)',
                }}
              >
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  ✉️
                </div>
                <h3
                  style={{
                    marginBottom: 'var(--space-2)',
                    fontSize: '20px',
                    fontWeight: '600',
                  }}
                >
                  {t('auth.emailSent')}
                </h3>
                <p
                  style={{
                    color: 'var(--color-neutral-600)',
                    marginBottom: 'var(--space-6)',
                  }}
                >
                  {t('auth.emailSentDescription')}
                </p>
                <button
                  type="button"
                  onClick={handleBackFromForgotPassword}
                  className="submit-button"
                  style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    width: '100%',
                  }}
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            </div>
          )}

          {/* Back button for forgot password step (only show when not success) */}
          {step === 'forgot-password' && !forgotSuccess && (
            <button
              type="button"
              onClick={handleBackFromForgotPassword}
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
