/**
 * Forgot Password Route (/forgot-password)
 * User enters email to request password reset link
 */

import type { JSX, FormEvent } from 'react';
import { useState } from 'react';
import { Link, type MetaFunction } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireNoAuth } from '~/utilities/auth.loader';
import { requestPasswordResetBusinessLogic } from '~/server/businessLogic/authBusinessLogic';
import { setGlobalLoading, setLanguage } from '~/store/slices/uiSlice';
import { useAppDispatch } from '~/store/hooks';
import { useTranslation } from '~/lib/i18n/utils';
import type { Language } from '~/lib/i18n/types';
import Select from '~/components/ui/Select';

// Type declaration for Vite environment variables
interface ViteImportMetaEnv {
  readonly VITE_PASSWORD_RESET_URL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const PASSWORD_RESET_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_PASSWORD_RESET_URL ?? '';

export const meta: MetaFunction = () => {
  return [
    { title: 'Forgot Password - Tours Admin' },
    { name: 'description', content: 'Reset your password' },
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

export default function ForgotPasswordRoute(): JSX.Element {
  const dispatch = useAppDispatch();
  const { t, language: currentLang } = useTranslation();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLanguageChange = (value: string): void => {
    dispatch(setLanguage(value as Language));
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError(t('auth.errorIncomplete'));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('validation.email'));
      return;
    }

    setIsLoading(true);
    dispatch(setGlobalLoading({ isLoading: true, message: t('auth.sendingResetLink') }));

    try {
      const result = await requestPasswordResetBusinessLogic({
        email,
        resetUrl: PASSWORD_RESET_URL,
      });

      if (result.success === true) {
        setSuccess(true);
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
          }
        }

        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.errorGenericLogin');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

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
          <h1 className="login-heading">{t('auth.forgotPasswordTitle')}</h1>
          <p className="login-description">{t('auth.forgotPasswordDescription')}</p>

          {!success ? (
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
                  autoComplete="email"
                />
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
                {isLoading ? t('common.loading') : t('auth.sendResetLink')}
              </button>
            </form>
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
                  ✉️
                </div>
                <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '20px', fontWeight: '600' }}>
                  {t('auth.emailSent')}
                </h3>
                <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-6)' }}>
                  {t('auth.emailSentDescription')}
                </p>
                <Link
                  to="/"
                  className="submit-button"
                  style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    padding: 'var(--space-3) var(--space-6)',
                    backgroundColor: 'var(--color-primary-600)',
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </div>
          )}

          {/* Back to login link */}
          {!success && (
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
          )}
        </div>
      </div>
    </div>
  );
}
