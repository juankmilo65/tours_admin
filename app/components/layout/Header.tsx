/**
 * Header Component - Top Navigation Bar
 */

import type { JSX } from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { translateCountries, translateCountry, type Country } from '~/store/slices/countriesSlice';
import { setGlobalLoading, setLanguage, selectLanguage } from '~/store/slices/uiSlice';
import { logout as logoutAction, selectAuthToken } from '~/store/slices/authSlice';
import type { Option } from '~/components/ui/Select';
import Select from '~/components/ui/Select';
import {
  useSubmit,
  useNavigation,
  useLocation,
  useSearchParams,
  useNavigate,
} from '@remix-run/react';
import { useTranslation } from '~/lib/i18n/utils';
import type { Language } from '~/lib/i18n/types';

interface HeaderProps {
  title: string;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleSidebarCollapse: () => void;
  countries: Country[];
  selectedCountryCode: string;
}

export function Header({
  title,
  isSidebarOpen,
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleSidebarCollapse,
  countries,
  selectedCountryCode,
}: HeaderProps): JSX.Element {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // i18n hook
  const { t } = useTranslation();

  // Redux state solo para language
  const dispatch = useAppDispatch();
  const currentLanguage = useAppSelector(selectLanguage);
  const authToken = useAppSelector(selectAuthToken);

  // Translate countries based on current language usando props
  const translatedCountries = useMemo(
    () => translateCountries(countries, currentLanguage as Language),
    [countries, currentLanguage]
  );

  // Find and translate selected country
  const translatedSelectedCountry = useMemo(() => {
    const selectedCountry = countries.find((c) => c.code === selectedCountryCode);
    return selectedCountry ? translateCountry(selectedCountry, currentLanguage as Language) : null;
  }, [countries, selectedCountryCode, currentLanguage]);

  // Form submission for country change
  const submit = useSubmit();
  const navigation = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const isChangingCountry = navigation.state === 'submitting' || navigation.state === 'loading';

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    dispatch(setLanguage(lang));
  };

  // Turn off global loading when navigation completes
  useEffect(() => {
    if (navigation.state === 'idle') {
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  }, [navigation.state, dispatch]);

  // Handle country change
  const handleCountryChange = (countryCode: string) => {
    // Don't trigger if same country
    if (countryCode === selectedCountryCode) {
      return;
    }

    // Find the country to get its id
    const country = countries.find((c) => c.code === countryCode);
    if (!country) {
      console.error('Country not found:', countryCode);
      return;
    }

    // Show global loading
    dispatch(setGlobalLoading({ isLoading: true }));

    // Clear all filters from URL
    setSearchParams({});

    // Use submit to the API resource route - send both countryId and countryCode
    const formData = new FormData();
    formData.append('countryId', country.id);
    formData.append('countryCode', countryCode);
    formData.append('returnTo', location.pathname);

    submit(formData, { method: 'post', action: '/api/changeCountry' });
  };

  // Check if screen is mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 1024);
    }

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle logout
  const handleLogout = () => {
    setIsLoggingOut(true);
    dispatch(setGlobalLoading({ isLoading: true, message: t('auth.loggingOut') }));

    try {
      // Create FormData with token
      const formData = new FormData();
      formData.append('action', 'logoutUserBusinessLogic');
      if (authToken !== null && authToken.trim() !== '') {
        formData.append('token', authToken);
      }

      // Call logout API using Remix submit
      submit(formData, { method: 'post', action: '/api/auth/logout' });
      // Clear Redux state
      dispatch(logoutAction());
      // Redirect to login
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout locally even if API fails
      dispatch(logoutAction());
      navigate('/');
    } finally {
      setIsLoggingOut(false);
      dispatch(setGlobalLoading({ isLoading: false }));
      setShowLogoutModal(false);
      setIsUserMenuOpen(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--color-neutral-50)',
        borderBottom: '1px solid var(--color-neutral-200)',
        position: 'fixed',
        top: 0,
        left: isMobile ? 0 : isSidebarCollapsed ? '80px' : '280px',
        right: 0,
        zIndex: 'var(--z-fixed)',
        transition: 'left var(--transition-base)',
      }}
    >
      <div
        style={{
          height: '100%',
          padding: '0 var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Mobile: Hamburger Menu Button */}
          {isMobile && (
            <button
              type="button"
              onClick={onToggleSidebar}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                padding: '8px',
                transition: 'background-color var(--transition-base)',
                zIndex: 10,
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label="Abrir menú"
              aria-expanded={isSidebarOpen}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: 'var(--color-neutral-700)',
                }}
              ></span>
              <span
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: 'var(--color-neutral-700)',
                }}
              ></span>
              <span
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: 'var(--color-neutral-700)',
                }}
              ></span>
            </button>
          )}

          {/* Desktop: Collapse/Expand Button (Hamburger) */}
          {!isMobile && (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                padding: '4px',
                transition: 'all var(--transition-base)',
                zIndex: 2,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={isSidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <img
                src="/hamburger-icon.svg"
                alt={isSidebarCollapsed ? 'Expandir' : 'Colapsar'}
                style={{
                  width: '32px',
                  height: '32px',
                  transform: isSidebarCollapsed ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform var(--transition-base)',
                }}
              />
            </button>
          )}
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-700)',
            }}
          >
            {title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
              🌐
            </span>
            <Select
              options={[
                { value: 'es', label: t('common.spanish') },
                { value: 'en', label: t('common.english') },
              ]}
              value={currentLanguage}
              onChange={handleLanguageChange}
              placeholder={t('common.select')}
              className=""
              id="select-language"
            />
          </div>

          {/* Country Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>
              🌍
            </span>
            <Select
              options={
                translatedCountries.length === 0
                  ? [{ value: '', label: t('common.loadingCountries') }]
                  : translatedCountries.map((c): Option => ({ value: c.code, label: c.name }))
              }
              value={translatedSelectedCountry?.code ?? ''}
              onChange={handleCountryChange}
              disabled={isChangingCountry}
              placeholder={t('common.selectCountry')}
              id="select-country"
            />
            {isChangingCountry && (
              <span
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                ⏳
              </span>
            )}
          </div>

          <button
            style={{
              padding: 'var(--space-2)',
              color: 'var(--color-neutral-500)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              fontSize: 'var(--text-lg)',
              transition: 'background-color var(--transition-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
              e.currentTarget.style.color = 'var(--color-neutral-700)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-neutral-500)';
            }}
          >
            🔔
          </button>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2)',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'background-color var(--transition-base)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                    margin: 0,
                  }}
                >
                  Admin User
                </p>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-500)',
                    margin: 0,
                  }}
                >
                  admin@tours.com
                </p>
              </div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'var(--color-primary-500)',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                A
              </div>
              <span style={{ color: 'var(--color-neutral-500)', fontSize: 'var(--text-sm)' }}>
                {isUserMenuOpen ? '▲' : '▼'}
              </span>
            </button>

            {/* User Menu Dropdown */}
            {isUserMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + var(--space-2))',
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid var(--color-neutral-200)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '200px',
                  padding: 'var(--space-2)',
                  zIndex: 'var(--z-dropdown)',
                }}
              >
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-neutral-700)',
                    transition: 'background-color var(--transition-base)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>👤</span>
                  <span>{t('header.profile')}</span>
                </button>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-neutral-700)',
                    transition: 'background-color var(--transition-base)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>⚙️</span>
                  <span>{t('header.settings')}</span>
                </button>
                <div
                  style={{
                    height: '1px',
                    backgroundColor: 'var(--color-neutral-200)',
                    margin: 'var(--space-2) 0',
                  }}
                ></div>
                <button
                  onClick={() => {
                    setShowLogoutModal(true);
                    setIsUserMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-error-600)',
                    transition: 'background-color var(--transition-base)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>🚪</span>
                  <span>{t('header.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <>
          {/* Backdrop that blocks all interactions */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
              pointerEvents: 'auto',
            }}
            onClick={() => setShowLogoutModal(false)}
          />
          {/* Modal content */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                maxWidth: '400px',
                width: '90%',
                boxShadow: 'var(--shadow-lg)',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
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
                {t('auth.logoutConfirmTitle')}
              </h3>
              <p
                style={{
                  marginBottom: 'var(--space-6)',
                  color: 'var(--color-neutral-700)',
                  lineHeight: 1.5,
                }}
              >
                {t('auth.logoutConfirmMessage')}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'var(--color-neutral-200)',
                    color: 'var(--color-neutral-700)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '500',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'var(--color-error-600)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '500',
                  }}
                >
                  {isLoggingOut ? t('auth.loggingOut') : t('auth.logoutConfirmButton')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
