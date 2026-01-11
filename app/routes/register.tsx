/**
 * Register Route
 * Modern registration page with 2 column layout
 */

import type { JSX, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link, type MetaFunction } from '@remix-run/react';
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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    // Validaciones
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError(t('auth.errorIncomplete'));
      return;
    }

    if (password.length < 8) {
      // Assuming simple validation message here as defined in translations
      setError(t('validation.minLength', { min: 8 }));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.errorMatch'));
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
              />
            </div>

            <div className="form-field">
              <label htmlFor="password" className="form-label">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="form-input"
              />
              <p className="form-hint">{t('auth.minChars')}</p>
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword" className="form-label">
                {t('auth.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="form-input"
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
    </div>
  );
}
