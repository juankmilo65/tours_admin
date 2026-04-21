/**
 * Header Component - Top Navigation Bar
 */

import type { JSX } from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { translateCountries, translateCountry, type Country } from '~/store/slices/countriesSlice';
import {
  selectCurrentUser,
  selectAuthToken,
  selectOwnerKycStatus,
  updateUser,
} from '~/store/slices/authSlice';
import { getUserByIdBusiness } from '~/server/businessLogic/usersBusinessLogic';
import {
  setGlobalLoading,
  setLanguage,
  selectLanguage,
  setLogoutModal,
} from '~/store/slices/uiSlice';
import { selectHeaderUser } from '~/store/slices/headerSlice';
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // i18n hook
  const { t } = useTranslation();

  // Redux state
  const dispatch = useAppDispatch();
  const currentLanguage = useAppSelector(selectLanguage);
  const currentUser = useAppSelector(selectCurrentUser);
  const authToken = useAppSelector(selectAuthToken);
  // Header display data — kept in sync by ProfileInfoSection independently of auth
  const headerUser = useAppSelector(selectHeaderUser);

  // One-time profile refresh to load avatarUrl if missing
  const profileFetchedRef = useRef(false);
  const refreshUserProfile = useCallback(async () => {
    if (
      currentUser !== null &&
      authToken !== null &&
      profileFetchedRef.current === false &&
      currentUser.avatarUrl === undefined
    ) {
      profileFetchedRef.current = true;
      const fullUser = await getUserByIdBusiness(currentUser.id, authToken, currentLanguage);
      if (fullUser !== null) {
        dispatch(updateUser(fullUser));
      }
    }
  }, [currentUser, authToken, currentLanguage, dispatch]);

  useEffect(() => {
    void refreshUserProfile();
  }, [refreshUserProfile]);

  // Get user initials — prefer headerSlice (updated by profile page in real-time)
  const userInitials = useMemo(() => {
    const first =
      headerUser.firstName !== '' ? headerUser.firstName : (currentUser?.firstName ?? '');
    const last = headerUser.lastName !== '' ? headerUser.lastName : (currentUser?.lastName ?? '');
    if (first === '' && last === '') return '?';
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  }, [headerUser, currentUser]);

  // Get user display name and email
  const { userDisplayName, userEmail } = useMemo(() => {
    const first =
      headerUser.firstName !== '' ? headerUser.firstName : (currentUser?.firstName ?? '');
    const last = headerUser.lastName !== '' ? headerUser.lastName : (currentUser?.lastName ?? '');
    if (first === '' && last === '') {
      return {
        userDisplayName: t('header.guest'),
        userEmail: t('header.noEmail'),
      };
    }

    const displayName = `${first} ${last}`;
    const email =
      currentUser?.email !== undefined && currentUser.email !== ''
        ? currentUser.email
        : t('header.noEmail');

    return {
      userDisplayName: displayName,
      userEmail: email,
    };
  }, [headerUser, currentUser, t]);

  // KYC notification check
  const ownerKycStatus = useAppSelector(selectOwnerKycStatus);
  const isKycInProgress = ownerKycStatus === 'in_progress';
  const isKycCompleted = ownerKycStatus === 'completed';
  const isKycRejected = ownerKycStatus === 'rejected';
  const isKycRestrictedSoon = ownerKycStatus === 'restricted_soon';
  const isKycPastDue = ownerKycStatus === 'requirements.past_due';
  const isKycPendingVerification = ownerKycStatus === 'requirements.pending_verification';
  const isKycPlatformPaused = ownerKycStatus === 'platform_paused';
  const isKycListed = ownerKycStatus === 'listed';
  const isKycUnderReview = ownerKycStatus === 'under_review';
  // Terminal states: user cannot operate, no retry
  const isKycTerminal = isKycRejected || isKycPlatformPaused || isKycListed;
  // Info-only states: user just waits (blue)
  const isKycInfoOnly = isKycPendingVerification || isKycUnderReview;
  // States where button should be shown to (re)start verification
  const isKycActionable = isKycInProgress || isKycRestrictedSoon || isKycPastDue;
  // Any non-default status means we have a notification
  const hasKycNotification =
    currentUser?.role === 'owner' &&
    (currentUser?.ownerKycVerified !== true ||
      isKycInProgress ||
      isKycCompleted ||
      isKycTerminal ||
      isKycInfoOnly ||
      isKycActionable);
  const notificationCount = hasKycNotification ? 1 : 0;

  // KYC notification color scheme based on status
  const kycColor = isKycCompleted
    ? {
        bg500: 'var(--color-success-500, #22c55e)',
        bg100: 'var(--color-success-100, #dcfce7)',
        bg50: 'var(--color-success-50, #f0fdf4)',
        text700: 'var(--color-success-700, #15803d)',
        text600: 'var(--color-success-600, #16a34a)',
      }
    : isKycInfoOnly
      ? {
          bg500: '#3b82f6',
          bg100: '#dbeafe',
          bg50: '#eff6ff',
          text700: '#1e40af',
          text600: '#2563eb',
        }
      : isKycInProgress
        ? {
            bg500: 'var(--color-warning-500, #f59e0b)',
            bg100: 'var(--color-warning-100, #fef3c7)',
            bg50: 'var(--color-warning-50, #fffbeb)',
            text700: 'var(--color-warning-700, #b45309)',
            text600: 'var(--color-warning-600, #d97706)',
          }
        : isKycRestrictedSoon
          ? {
              bg500: '#ea580c',
              bg100: '#ffedd5',
              bg50: '#fff7ed',
              text700: '#9a3412',
              text600: '#ea580c',
            }
          : isKycPastDue || isKycTerminal
            ? {
                bg500: 'var(--color-error-500)',
                bg100: 'var(--color-error-100)',
                bg50: 'var(--color-error-50)',
                text700: 'var(--color-error-700)',
                text600: 'var(--color-error-600)',
              }
            : {
                // not_started: gray
                bg500: '#6b7280',
                bg100: '#f3f4f6',
                bg50: '#f9fafb',
                text700: '#374151',
                text600: '#4b5563',
              };

  // Helper to get the right badge/title/description per status
  const getKycBadge = (): string => {
    if (isKycCompleted) return t('header.kycCompletedBadge');
    if (isKycInProgress) return t('header.kycInProgressTitle');
    if (isKycRestrictedSoon) return t('header.kycRestrictedSoonBadge');
    if (isKycRejected) return t('header.kycRejectedBadge');
    if (isKycPastDue) return t('header.kycPastDueBadge');
    if (isKycPendingVerification) return t('header.kycPendingVerificationBadge');
    if (isKycPlatformPaused) return t('header.kycPlatformPausedBadge');
    if (isKycListed) return t('header.kycListedBadge');
    if (isKycUnderReview) return t('header.kycUnderReviewBadge');
    return t('header.kycUrgent');
  };
  const getKycTitle = (): string => {
    if (isKycCompleted) return t('header.kycCompletedTitle');
    if (isKycInProgress) return t('header.kycInProgressTitle');
    if (isKycRestrictedSoon) return t('header.kycRestrictedSoonTitle');
    if (isKycRejected) return t('header.kycRejectedTitle');
    if (isKycPastDue) return t('header.kycPastDueTitle');
    if (isKycPendingVerification) return t('header.kycPendingVerificationTitle');
    if (isKycPlatformPaused) return t('header.kycPlatformPausedTitle');
    if (isKycListed) return t('header.kycListedTitle');
    if (isKycUnderReview) return t('header.kycUnderReviewTitle');
    return t('header.kycTitle');
  };
  const getKycDescription = (): string => {
    if (isKycCompleted) return t('header.kycCompletedDescription');
    if (isKycInProgress) return t('header.kycInProgressDescription');
    if (isKycRestrictedSoon) return t('header.kycRestrictedSoonDescription');
    if (isKycRejected) return t('header.kycRejectedDescription');
    if (isKycPastDue) return t('header.kycPastDueDescription');
    if (isKycPendingVerification) return t('header.kycPendingVerificationDescription');
    if (isKycPlatformPaused) return t('header.kycPlatformPausedDescription');
    if (isKycListed) return t('header.kycListedDescription');
    if (isKycUnderReview) return t('header.kycUnderReviewDescription');
    return t('header.kycDescription');
  };
  // Show action link for: not_started, in_progress, restricted_soon, requirements.past_due
  const showKycAction = !isKycCompleted && !isKycInfoOnly && !isKycTerminal;

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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
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

          {/* Notification Bell */}
          <div style={{ position: 'relative' }} ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label={t('header.notificationBell')}
              style={{
                position: 'relative',
                padding: 'var(--space-2)',
                color: 'var(--color-neutral-500)',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                fontSize: 'var(--text-lg)',
                transition: 'all var(--transition-base)',
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
              {notificationCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    backgroundColor: kycColor.bg500,
                    color: 'white',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: 'var(--font-weight-bold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    border: '2px solid var(--color-neutral-50)',
                    animation: isKycCompleted || isKycInfoOnly ? undefined : 'pulse 2s infinite',
                  }}
                >
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + var(--space-2))',
                  right: 0,
                  width: '380px',
                  maxHeight: '480px',
                  backgroundColor: 'white',
                  border: '1px solid var(--color-neutral-200)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.08)',
                  zIndex: 'var(--z-dropdown)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: '1px solid var(--color-neutral-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-neutral-800)',
                    }}
                  >
                    {t('header.notificationBell')}
                  </h3>
                  {notificationCount > 0 && (
                    <span
                      style={{
                        backgroundColor: kycColor.bg100,
                        color: kycColor.text700,
                        fontSize: '12px',
                        fontWeight: 'var(--font-weight-semibold)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      {notificationCount}
                    </span>
                  )}
                </div>

                {/* Notification List */}
                <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
                  {hasKycNotification ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/profile');
                      }}
                      style={{
                        width: '100%',
                        padding: 'var(--space-4) var(--space-5)',
                        display: 'flex',
                        gap: 'var(--space-3)',
                        alignItems: 'flex-start',
                        backgroundColor: kycColor.bg50,
                        border: 'none',
                        borderBottom: '1px solid var(--color-neutral-100)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color var(--transition-base)',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = kycColor.bg100;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = kycColor.bg50;
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          minWidth: '40px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: kycColor.bg500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                        }}
                      >
                        {isKycCompleted ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        ) : isKycInfoOnly ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        ) : isKycTerminal ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            marginBottom: '4px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 'var(--font-weight-bold)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'white',
                              backgroundColor: kycColor.bg500,
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {getKycBadge()}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: '0 0 4px 0',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-neutral-800)',
                            lineHeight: '1.3',
                          }}
                        >
                          {getKycTitle()}
                        </p>
                        <p
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-neutral-600)',
                            lineHeight: '1.4',
                          }}
                        >
                          {getKycDescription()}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-neutral-400)',
                            }}
                          >
                            {t('header.justNow')}
                          </span>
                          {showKycAction && (
                            <span
                              style={{
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--color-error-600)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {t('header.kycAction')}
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unread dot */}
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          minWidth: '8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: kycColor.bg500,
                          marginTop: '6px',
                        }}
                      />
                    </button>
                  ) : (
                    /* Empty state */
                    <div
                      style={{
                        padding: 'var(--space-8) var(--space-5)',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '40px',
                          marginBottom: 'var(--space-3)',
                          opacity: 0.4,
                        }}
                      >
                        🔔
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-neutral-400)',
                        }}
                      >
                        {t('header.noNotifications')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
                  {userDisplayName}
                </p>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-500)',
                    margin: 0,
                  }}
                >
                  {userEmail}
                </p>
              </div>
              {/* Resolve avatar: headerSlice wins once synced (profile page visit), then authSlice fallback */}
              {(() => {
                const resolvedAvatar =
                  headerUser.avatarUrl !== undefined
                    ? headerUser.avatarUrl
                    : (currentUser?.avatarUrl ?? null);
                return resolvedAvatar !== null && resolvedAvatar !== '';
              })() ? (
                <img
                  src={
                    (headerUser.avatarUrl !== undefined
                      ? headerUser.avatarUrl
                      : currentUser?.avatarUrl) as string
                  }
                  alt={userDisplayName}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-full)',
                    objectFit: 'cover',
                    backgroundColor: 'var(--color-primary-500)',
                  }}
                />
              ) : (
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
                  {userInitials}
                </div>
              )}
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
                  onClick={() => {
                    navigate('/profile');
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
                    dispatch(setLogoutModal(true));
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
    </header>
  );
}
