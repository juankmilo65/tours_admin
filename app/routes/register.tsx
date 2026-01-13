/**
 * Register Route
 * Modern registration page with 2 column layout
 */

import type { JSX, FormEvent } from 'react';
import type { MouseEvent } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link, type MetaFunction, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  selectIsAuthenticated,
} from '~/store/slices/authSlice';
import { registerUser } from '~/services/auth.service';
import { setGlobalLoading, setLanguage } from '~/store/slices/uiSlice';
import Select from '~/components/ui/Select';
import { useTranslation } from '~/lib/i18n/utils';
import type { Language } from '~/lib/i18n/types';
import termsConditionsBL from '~/server/businessLogic/termsConditionsBusinessLogic';

type LoaderData = {
  terms: {
    success?: boolean;
    data?: Array<{
      id: string;
      termsConditions_es: string;
      termsConditions_en: string;
      type: string;
      version: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    count?: number;
  };
};

export async function loader({ request }: LoaderFunctionArgs): Promise<{ terms: unknown }> {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') ?? 'es';
  console.warn('Loader called with lang:', lang);
  const formData = new FormData();
  formData.append('action', 'getTermsConditionsByTypeBusinessLogic');
  formData.append('type', 'registration');
  formData.append('language', lang);
  console.warn('Calling termsConditionsBL with formData:', {
    action: formData.get('action'),
    type: formData.get('type'),
    language: formData.get('language'),
  });
  const result = await termsConditionsBL(formData);
  console.warn('Terms and conditions loaded in register loader:', result);
  return { terms: result };
}

export const meta: MetaFunction = () => {
  return [
    { title: 'Registro - Tours Admin' },
    { name: 'description', content: 'Crea tu cuenta en Tours Admin' },
  ];
};

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export default function RegisterRoute(): JSX.Element {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { t, language: currentLang } = useTranslation();
  const loaderData = useLoaderData<LoaderData>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password 1 Visibility Logic
  const [passLocked, setPassLocked] = useState(false);
  const [passHover, setPassHover] = useState(false);
  const showPassword = passLocked || passHover;

  // Password 2 Visibility Logic
  const [confirmPassLocked, setConfirmPassLocked] = useState(false);
  const [confirmHover, setConfirmHover] = useState(false);
  const showConfirmPassword = confirmPassLocked || confirmHover;

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Terms and conditions state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsData, setTermsData] = useState<string | null>(null);
  const [termsTitle, setTermsTitle] = useState('');

  // Set terms from loader data
  useEffect(() => {
    console.warn('useEffect setting terms, loaderData.terms:', loaderData.terms);
    if (
      loaderData.terms.success === true &&
      loaderData.terms.data !== undefined &&
      loaderData.terms.data.length > 0
    ) {
      const termsObj = loaderData.terms.data[0];
      const contentKey = `termsConditions_${currentLang}` as keyof typeof termsObj;
      const content = termsObj[contentKey] as string;
      console.warn('Setting termsData with contentKey:', contentKey, 'content:', content);
      setTermsData(content);
      setTermsTitle(t('auth.termsTitle'));
    } else {
      console.warn('Terms not successful or no data');
    }
  }, [loaderData.terms, currentLang, t]);

  // Refetch terms if language changes
  useEffect(() => {
    navigate(`?lang=${currentLang}`, { replace: true });
  }, [currentLang, navigate]);

  // Derived state for validation
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 8;
  const isFormValid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    isPasswordValid &&
    confirmPassword !== '' &&
    passwordsMatch &&
    termsAccepted;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones finales por seguridad
    if (!isFormValid) {
      setError(t('auth.errorIncomplete'));
      return;
    }

    setIsLoading(true);
    dispatch(loginStart());
    dispatch(setGlobalLoading({ isLoading: true, message: t('auth.registering') }));

    try {
      const response = await registerUser({
        email,
        password,
        role: 'user',
        firstName,
        lastName,
      });

      if (response.success && response.data) {
        // Auto login después del registro exitoso
        dispatch(
          loginSuccess({
            user: response.data.user,
            token: response.data.token,
          })
        );
        navigate('/dashboard');
      } else {
        const errorMessage = response.error ?? response.message ?? t('auth.errorGenericRegister');
        setError(errorMessage);
        dispatch(loginFailure(errorMessage));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.errorGenericRegister');
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

  const handleOpenTermsModal = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.preventDefault();
    console.warn('Opening terms modal, termsData:', termsData, 'termsTitle:', termsTitle);
    setShowTermsModal(true);
  };

  const handleAcceptTermsFromModal = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
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
    <div className="register-container">
      <div className="register-left">
        <div className="register-decoration-1" />
        <div className="register-decoration-2" />

        <div className="register-branding">
          <div className="register-title">🏛️ {t('auth.title')}</div>
          <p className="register-subtitle">{t('auth.subtitleRegister')}</p>

          <div className="register-image">
            <img src="/login_tours_image.png" alt="Tours illustration" />
          </div>
        </div>
      </div>

      <div className="register-right">
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

        <div className="register-form-container">
          <h1 className="register-heading">{t('auth.createAccount')}</h1>
          <p className="register-description">{t('auth.fillForm')}</p>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="register-form"
          >
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="firstName" className="form-label">
                  {t('auth.firstName')}
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  disabled={isLoading}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="lastName" className="form-label">
                  {t('auth.lastName')}
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('auth.lastNamePlaceholder')}
                  disabled={isLoading}
                  className="form-input"
                  required
                />
              </div>
            </div>

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
                required
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
                  required
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
              <p className="form-hint">{t('auth.minChars')}</p>
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword" className="form-label">
                {t('auth.confirmPassword')}
              </label>
              <div className="password-input-container">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setConfirmPassLocked(!confirmPassLocked)}
                  onMouseEnter={() => setConfirmHover(true)}
                  onMouseLeave={() => setConfirmHover(false)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  title="Click to toggle, hover to peek"
                >
                  {showConfirmPassword ? EyeOffIcon : EyeIcon}
                </button>
              </div>
              {confirmPassword !== '' && !passwordsMatch && (
                <div className="validation-error">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{t('auth.errorMatch')}</span>
                </div>
              )}
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="form-field">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <input
                  id="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={isLoading}
                  required
                  style={{
                    marginTop: 3,
                    width: 18,
                    height: 18,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="termsAccepted"
                    style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {t('auth.acceptTerms')}
                  </label>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleOpenTermsModal}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary-500)',
                      textDecoration: 'underline',
                      padding: 0,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      font: 'inherit',
                    }}
                  >
                    {t('auth.viewTerms')}
                  </span>
                </div>
              </div>
            </div>

            {error !== null && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`submit-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? t('auth.registering') : t('auth.register')}
            </button>
          </form>

          <div className="login-link">
            <p>
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/" className="link">
                {t('auth.loginLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: 'min(800px, 92%)',
              maxHeight: '85vh',
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '24px 24px 16px',
                borderBottom: '1px solid var(--color-neutral-200)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: 'var(--color-neutral-900)',
                }}
              >
                {termsTitle || t('auth.termsTitle')}
              </h2>
            </div>

            {/* Content with scroll */}
            <div
              style={{
                padding: '24px',
                overflowY: 'auto',
                flex: 1,
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'var(--color-neutral-700)',
              }}
            >
              {termsData !== null ? (
                <div
                  dangerouslySetInnerHTML={{ __html: termsData }}
                  style={{
                    whiteSpace: 'pre-wrap',
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: 'var(--color-neutral-500)',
                  }}
                >
                  {t('auth.termsLoadingError')}
                </div>
              )}
            </div>

            {/* Footer - Accept button only, no close button */}
            <div
              style={{
                padding: '16px 24px 24px',
                borderTop: '1px solid var(--color-neutral-200)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleAcceptTermsFromModal}
                style={{
                  padding: '12px 32px',
                  background: 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary-600)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary-500)';
                }}
              >
                {t('auth.acceptTermsButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
