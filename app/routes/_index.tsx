/**
 * Login Route (/)
 * Modern login page with 2 column layout
 */

import type { JSX, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link, type MetaFunction } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireNoAuth } from '~/utilities/auth.loader';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  selectIsAuthenticated,
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
  const { t, language: currentLang } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password Visibility Logic
  const [passLocked, setPassLocked] = useState(false);
  const [passHover, setPassHover] = useState(false);
  const showPassword = passLocked || passHover;

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
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
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      // eslint-disable-next-line no-undef
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as {
        success?: boolean;
        data?: { user: unknown; accessToken: string };
        error?: string;
        message?: string;
      };

      if (response.ok && result.success === true && result.data) {
        dispatch(
          loginSuccess({
            user: result.data.user,
            token: result.data.accessToken,
          })
        );
        navigate('/dashboard');
      } else {
        const errorMessage = result.error ?? result.message ?? t('auth.errorGenericLogin');
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

  const handleLanguageChange = (value: string) => {
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
          <h1 className="login-heading">{t('auth.welcome')}</h1>
          <p className="login-description">{t('auth.welcomeSub')}</p>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
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
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>

          <div className="register-link">
            <p>
              {t('auth.registerPrompt')}{' '}
              <Link to="/register" className="link">
                {t('auth.registerLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
