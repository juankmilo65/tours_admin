/**
 * New Password Route (/newPassword)
 * User sets new password using token from email link
 */

import type { JSX, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, type MetaFunction } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { resetPasswordBusinessLogic } from '~/server/businessLogic/authBusinessLogic';
import { setGlobalLoading, setLanguage } from '~/store/slices/uiSlice';
import { useAppDispatch } from '~/store/hooks';
import { useTranslation } from '~/lib/i18n/utils';
import type { Language } from '~/lib/i18n/types';
import Select from '~/components/ui/Select';

export const meta: MetaFunction = () => {
  return [
    { title: 'Reset Password - Tours Admin' },
    { name: 'description', content: 'Set your new password' },
  ];
};

export function loader(args: LoaderFunctionArgs): Promise<null> {
  const request = args.request;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  const tokenPreview =
    token !== null && token !== undefined && token !== '' ? `${token.substring(0, 20)}...` : 'null';

  console.log('🔑 [NEW PASSWORD LOADER] Token from URL:', tokenPreview);

  console.log('🔑 [NEW PASSWORD LOADER] Allowing access to /newPassword');
  console.log('🔑 [NEW PASSWORD LOADER] Component will validate token and redirect if needed');

  // Always allow access to this route
  // The component will validate token and redirect if needed
  return Promise.resolve(null);
}

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export default function NewPasswordRoute(): JSX.Element {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t, language: currentLang } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Safe token extraction with explicit null/undefined/empty check
  const safeToken = token === null || token === undefined || token === '' ? null : token;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password visibility state
  const [passLocked, setPassLocked] = useState(false);
  const [passHover, setPassHover] = useState(false);
  const [confirmPassLocked, setConfirmPassLocked] = useState(false);
  const [confirmPassHover, setConfirmPassHover] = useState(false);
  const showPassword = passLocked || passHover;
  const showConfirmPassword = confirmPassLocked || confirmPassHover;

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

  // Redirect to login if no token is provided
  useEffect(() => {
    const tokenPreview =
      safeToken !== null && safeToken !== undefined && safeToken !== ''
        ? `${safeToken.substring(0, 20)}...`
        : 'null';

    console.log('🔑 [NEW PASSWORD COMPONENT] Token from searchParams:', tokenPreview);

    if (safeToken === null) {
      console.log('🔑 [NEW PASSWORD COMPONENT] No token, redirecting to login...');
      navigate('/');
    } else {
      console.log('🔑 [NEW PASSWORD COMPONENT] Token valid, showing reset password form');
    }
  }, [safeToken, navigate]);

  const handleLanguageChange = (value: string): void => {
    dispatch(setLanguage(value as Language));
  };

  const validatePassword = (password: string): boolean => {
    // Minimum 8 characters
    if (password.length < 8) {
      setError(t('auth.minChars'));
      return false;
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      setError('La contraseña debe tener al menos una letra mayúscula');
      return false;
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      setError('La contraseña debe tener al menos una letra minúscula');
      return false;
    }

    // At least one number
    if (!/[0-9]/.test(password)) {
      setError('La contraseña debe tener al menos un número');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    console.log('🔑 [NEW PASSWORD SUBMIT] Starting password reset process');

    if (
      newPassword === null ||
      newPassword === undefined ||
      newPassword === '' ||
      confirmPassword === null ||
      confirmPassword === undefined ||
      confirmPassword === ''
    ) {
      console.log('🔑 [NEW PASSWORD SUBMIT] Fields incomplete');
      setError(t('auth.errorIncomplete'));
      return;
    }

    if (!validatePassword(newPassword)) {
      console.log('🔑 [NEW PASSWORD SUBMIT] Password validation failed');
      return;
    }

    if (newPassword !== confirmPassword) {
      console.log('🔑 [NEW PASSWORD SUBMIT] Passwords do not match');
      setError(t('auth.errorMatch'));
      return;
    }

    if (safeToken === null) {
      console.log('🔑 [NEW PASSWORD SUBMIT] Invalid token');
      setError(t('auth.invalidToken'));
      return;
    }

    console.log('🔑 [NEW PASSWORD SUBMIT] All validations passed, calling backend...');

    setIsLoading(true);
    dispatch(setGlobalLoading({ isLoading: true, message: 'Restableciendo contraseña...' }));

    try {
      const result = await resetPasswordBusinessLogic({ token: safeToken, newPassword });

      console.log('🔑 [NEW PASSWORD SUBMIT] Backend response:', result);

      if (result.success === true) {
        console.log('🔑 [NEW PASSWORD SUBMIT] Password reset successful');
        setSuccess(true);
      } else {
        console.log('🔑 [NEW PASSWORD SUBMIT] Password reset failed:', result.error);
        let errorMessage = t('auth.errorResetPassword');

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
      console.log('🔑 [NEW PASSWORD SUBMIT] Exception caught:', err);
      const errorMessage = err instanceof Error ? err.message : t('auth.errorResetPassword');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

  // Show loading if no token
  if (safeToken === null) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        {t('common.loading')}
      </div>
    );
  }

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
          {!success ? (
            <>
              <h1 className="login-heading">{t('auth.resetPasswordTitle')}</h1>
              <p className="login-description">{t('auth.resetPasswordDescription')}</p>

              <form
                onSubmit={(e) => {
                  void handleSubmit(e);
                }}
                className="login-form"
              >
                <div className="form-field">
                  <label htmlFor="newPassword" className="form-label">
                    {t('auth.newPassword')}
                  </label>
                  <div className="password-input-container">
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="•••••••"
                      disabled={isLoading}
                      className="form-input"
                      autoComplete="new-password"
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
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-neutral-500)',
                      marginTop: '4px',
                    }}
                  >
                    {t('auth.minChars')}
                  </p>
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword" className="form-label">
                    {t('auth.confirmNewPassword')}
                  </label>
                  <div className="password-input-container">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="•••••••"
                      disabled={isLoading}
                      className="form-input"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setConfirmPassLocked(!confirmPassLocked)}
                      onMouseEnter={() => setConfirmPassHover(true)}
                      onMouseLeave={() => setConfirmPassHover(false)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      title="Click to toggle, hover to peek"
                    >
                      {showConfirmPassword ? EyeOffIcon : EyeIcon}
                    </button>
                  </div>
                </div>

                {error !== null && (
                  <div className="error-message">
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`submit-button ${isLoading ? 'loading' : ''}`}
                >
                  {isLoading ? t('common.loading') : t('auth.submit')}
                </button>
              </form>

              {/* Back to login link */}
              <div
                style={{
                  marginTop: 'var(--space-4)',
                  textAlign: 'center',
                }}
              >
                <Link
                  to="/"
                  style={{
                    color: 'var(--color-primary-600)',
                    textDecoration: 'none',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '500',
                  }}
                >
                  ← {t('auth.backToLogin')}
                </Link>
              </div>
            </>
          ) : (
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
                  ✅
                </div>
                <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '20px', fontWeight: '600' }}>
                  {t('auth.passwordResetSuccess')}
                </h3>
                <p
                  style={{
                    color: 'var(--color-neutral-600)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  {t('auth.passwordResetSuccessDescription')}
                </p>
                <p style={{ fontSize: '14px', color: 'var(--color-neutral-500)' }}>
                  {t('auth.passwordResetEmailSent')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
