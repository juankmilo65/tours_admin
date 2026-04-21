/**
 * ProfileInfoSection
 * Displays and allows editing of the logged-in owner's personal information.
 * Includes avatar upload/delete and terms & conditions acceptance status.
 */

import type { JSX, ChangeEvent, FormEvent, CSSProperties } from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Language } from '~/lib/i18n';
import { useAppSelector } from '~/store/hooks';
import { useAppDispatch } from '~/store/hooks';
import { selectAuth, selectAuthToken } from '~/store/slices/authSlice';
import { selectSelectedCountry } from '~/store/slices/countriesSlice';
import { selectLanguage } from '~/store/slices/uiSlice';
import { setHeaderUser, setHeaderAvatar } from '~/store/slices/headerSlice';
import {
  getUserByIdBusiness,
  updateUserBusiness,
  acceptLatestTermsBusiness,
  uploadUserAvatarBusiness,
  deleteUserAvatarBusiness,
} from '~/server/businessLogic/usersBusinessLogic';
import type { User, UpdateUserDto } from '~/server/businessLogic/usersBusinessLogic';
import { useDropdownCache } from '~/hooks/useDropdownCache';
import { t as translate } from '~/lib/i18n';
import type { CountryDropdown } from '~/types/country';
import type { IdentificationTypeDropdown } from '~/types/identificationType';
import { formatPhoneForCountry, getPhonePlaceholderForCountry } from '~/utilities/phoneFormatting';
import type { ProfileFieldErrors } from '../../utilities/profileValidation';
import { validateProfileForm } from '../../utilities/profileValidation';
import { TermsModal } from './TermsModal';

interface ViteImportMetaEnv {
  readonly VITE_PLATFORM_NAME?: string;
}
interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}
const PLATFORM_NAME =
  (import.meta as unknown as ViteImportMeta).env.VITE_PLATFORM_NAME ?? 'la plataforma';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  birthday: string;
  countryCode: string;
  identificationTypeId: string;
  identificationNumber: string;
}

const EMPTY_FORM: EditForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  birthday: '',
  countryCode: '',
  identificationTypeId: '',
  identificationNumber: '',
};

interface ProfileInfoSectionProps {
  language: string;
  onTermsChange: (accepted: boolean) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  const first = firstName.trim()[0] ?? '';
  const last = lastName.trim()[0] ?? '';
  return (first + last).toUpperCase();
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ProfileInfoSection({
  language,
  onTermsChange,
}: ProfileInfoSectionProps): JSX.Element {
  const auth = useAppSelector(selectAuth);
  const token = useAppSelector(selectAuthToken);
  const uiLanguage = useAppSelector(selectLanguage) as Language;
  const currentLanguage = uiLanguage ?? (language as Language);
  const selectedHeaderCountry = useAppSelector(selectSelectedCountry);
  const dispatch = useAppDispatch();
  const userId = auth.user?.id ?? '';

  const [profile, setProfile] = useState<User | null>(null);
  // Snapshot of profile taken when editing starts — used exclusively for hasChanges comparison
  const [originalProfile, setOriginalProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<ProfileFieldErrors>({});
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);

  const [countries, setCountries] = useState<CountryDropdown[]>([]);
  const [idTypes, setIdTypes] = useState<IdentificationTypeDropdown[]>([]);

  // Avatar state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Terms modal
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isAcceptingTerms, setIsAcceptingTerms] = useState(false);
  const [termsModalError, setTermsModalError] = useState<string | null>(null);

  const { loadNationalities, loadIdentificationTypes } = useDropdownCache();

  const t = useCallback(
    (en: string, es: string) => (currentLanguage === 'en' ? en : es),
    [currentLanguage]
  );

  // ── Fetch profile ───────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async (): Promise<User | null> => {
    if (userId === '' || token === null) return null;

    setIsLoading(true);
    const result = await getUserByIdBusiness(userId, token, currentLanguage);
    setProfile(result);
    if (result !== null) {
      const accepted = result.acceptedTerms === true;
      setTermsAccepted(accepted);
      onTermsChange(accepted);
      // Sync header display data in real-time
      dispatch(
        setHeaderUser({
          firstName: result.firstName,
          lastName: result.lastName,
          avatarUrl: result.avatarUrl ?? null,
        })
      );
    }
    setIsLoading(false);
    return result;
  }, [userId, token, currentLanguage, onTermsChange, dispatch]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchProfile();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [fetchProfile]);

  // ── Load countries ──────────────────────────────────────────────────────────

  useEffect(() => {
    void (async () => {
      const result = await loadNationalities(currentLanguage);
      setCountries(result);
    })();
  }, [currentLanguage, loadNationalities]);

  // ── Load id types when country changes in edit mode ─────────────────────────

  useEffect(() => {
    if (!isEditing || form.countryCode === '') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIdTypes([]);
      return;
    }
    void (async () => {
      const result = await loadIdentificationTypes(form.countryCode, currentLanguage);
      setIdTypes(result);
    })();
  }, [form.countryCode, isEditing, currentLanguage, loadIdentificationTypes]);

  // ── Avatar handlers ─────────────────────────────────────────────────────────

  const handleAvatarClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (file === undefined || userId === '' || token === null) return;

    // Reset file input so the same file can be re-selected if needed
    e.target.value = '';

    setAvatarError(null);
    setIsUploadingAvatar(true);

    const result = await uploadUserAvatarBusiness(userId, file, token, currentLanguage);

    setIsUploadingAvatar(false);

    if (result.success && result.data !== undefined) {
      const avatarUrl = result.data.avatarUrl;
      setProfile((prev) => (prev !== null ? { ...prev, avatarUrl } : prev));
      dispatch(setHeaderAvatar(avatarUrl ?? null));
    } else {
      setAvatarError(result.message ?? t('Error uploading photo', 'Error al subir la foto'));
    }
  };

  const handleDeleteAvatar = async (): Promise<void> => {
    if (userId === '' || token === null) return;

    setAvatarError(null);
    setIsDeletingAvatar(true);

    const result = await deleteUserAvatarBusiness(userId, token, currentLanguage);

    setIsDeletingAvatar(false);

    if (result.success) {
      setProfile((prev) => (prev !== null ? { ...prev, avatarUrl: null } : prev));
      dispatch(setHeaderAvatar(null));
    } else {
      setAvatarError(result.message ?? t('Error removing photo', 'Error al eliminar la foto'));
    }
  };

  // ── Form handlers ───────────────────────────────────────────────────────────

  const toDateInputValue = (value: string | undefined): string => {
    if (value === undefined || value === '') return '';

    // HTML date inputs only accept YYYY-MM-DD.
    const isoLike = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoLike !== null) {
      return isoLike[1] ?? '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  };

  const getAdultMaxDate = (): string => {
    const today = new Date();
    const adultDate = new Date(today);
    adultDate.setFullYear(today.getFullYear() - 18);

    const year = adultDate.getFullYear();
    const month = String(adultDate.getMonth() + 1).padStart(2, '0');
    const day = String(adultDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const adultMaxDate = getAdultMaxDate();
  const phonePlaceholder = getPhonePlaceholderForCountry(selectedHeaderCountry?.code);
  const translatedFormErrors = useMemo<ProfileFieldErrors>(() => {
    if (Object.keys(formErrors).length === 0) return formErrors;
    return validateProfileForm(form, currentLanguage, countries, selectedHeaderCountry).errors;
  }, [formErrors, form, currentLanguage, countries, selectedHeaderCountry]);

  const resolvedSaveError =
    Object.keys(formErrors).length > 0
      ? translate('profile.validation.correctHighlightedFields', currentLanguage)
      : saveError;

  const profileToForm = (user: User): EditForm => ({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: formatPhoneForCountry(user.phoneNumber ?? '', selectedHeaderCountry?.code),
    birthday: toDateInputValue(user.birthday),
    countryCode: user.nationality?.code ?? '',
    identificationTypeId: user.identificationType?.id ?? '',
    identificationNumber: user.identificationNumber ?? '',
  });

  // Returns true when current form differs from the persisted profile
  const hasChanges = (f: EditForm, user: User): boolean => {
    const original = profileToForm(user);
    return (
      f.firstName !== original.firstName ||
      f.lastName !== original.lastName ||
      f.email !== original.email ||
      f.phoneNumber !== original.phoneNumber ||
      f.birthday !== original.birthday ||
      f.countryCode !== original.countryCode ||
      f.identificationTypeId !== original.identificationTypeId ||
      f.identificationNumber !== original.identificationNumber
    );
  };

  const handleEdit = (): void => {
    if (profile !== null) {
      setOriginalProfile(profile);
      setForm(profileToForm(profile));
    }
    setSaveError(null);
    setSaveSuccess(false);
    setFormErrors({});
    setIsEditing(true);
  };

  const handleCancel = (): void => {
    setIsEditing(false);
    setOriginalProfile(null);
    setSaveError(null);
    setSaveSuccess(false);
    setFormErrors({});
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormErrors((prev: ProfileFieldErrors) => {
      if (prev[name as keyof EditForm] === undefined) return prev;
      const next = { ...prev };
      delete next[name as keyof EditForm];
      return next;
    });
    setForm((prev) => {
      const nextValue =
        name === 'phoneNumber' ? formatPhoneForCountry(value, selectedHeaderCountry?.code) : value;
      const next = { ...prev, [name]: nextValue };
      if (name === 'countryCode') next.identificationTypeId = '';
      return next;
    });
  };

  const handleSave = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (userId === '' || token === null) return;
    const validation = validateProfileForm(form, currentLanguage, countries, selectedHeaderCountry);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setSaveError(translate('profile.validation.correctHighlightedFields', currentLanguage));
      setSaveSuccess(false);
      return;
    }

    setFormErrors({});
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    const payload: Partial<UpdateUserDto & { acceptedTerms?: boolean }> = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phoneNumber: form.phoneNumber !== '' ? form.phoneNumber : undefined,
      birthday: form.birthday !== '' ? form.birthday : undefined,
      countryCode: form.countryCode !== '' ? form.countryCode : undefined,
      identificationTypeId:
        form.identificationTypeId !== '' ? form.identificationTypeId : undefined,
      identificationNumber:
        form.identificationNumber !== '' ? form.identificationNumber : undefined,
    };

    const result = await updateUserBusiness(userId, payload, token, currentLanguage);
    setIsSaving(false);

    if (result.success && result.data !== undefined) {
      setProfile(result.data);
      setOriginalProfile(null);
      const accepted = result.data.acceptedTerms === true;
      setTermsAccepted(accepted);
      onTermsChange(accepted);
      // Sync header with new name (avatar is unchanged on profile save)
      dispatch(
        setHeaderUser({
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          avatarUrl: result.data.avatarUrl ?? null,
        })
      );
      setSaveSuccess(true);
      setIsEditing(false);
    } else {
      setSaveError(result.message ?? translate('profile.validation.saveError', currentLanguage));
    }
  };

  const handleAcceptTermsFromModal = async (): Promise<void> => {
    if (token === null || token === '') return;

    setTermsModalError(null);
    setIsAcceptingTerms(true);

    const result = await acceptLatestTermsBusiness(token, currentLanguage);
    setIsAcceptingTerms(false);

    if (result.success) {
      await fetchProfile();
      setShowTermsModal(false);
      return;
    }

    setTermsModalError(
      result.message ??
        t(
          'Could not update terms acceptance. Please try again.',
          'No se pudo actualizar la aceptación de términos. Inténtalo de nuevo.'
        )
    );
  };

  // ── Display helpers ─────────────────────────────────────────────────────────

  const getLocalityName = (user: User): string => {
    const code = user.nationality?.code;
    if (code === undefined || code === '') return '—';
    // Prefer the already-loaded countries list (same source as the edit dropdown)
    const country = countries.find((c) => c.code === code);
    if (country !== undefined) {
      return currentLanguage === 'en' ? (country.name_en ?? '—') : (country.name_es ?? '—');
    }
    // Fallback: use raw fields from the profile object
    return currentLanguage === 'en'
      ? (user.nationality?.nationality_en ?? '—')
      : (user.nationality?.nationality_es ?? '—');
  };

  const getIdTypeName = (user: User): string => {
    if (user.identificationType === undefined) return '—';
    return currentLanguage === 'en'
      ? (user.identificationType.name_en ?? user.identificationType.code)
      : (user.identificationType.name_es ?? user.identificationType.code);
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (dateStr === undefined || dateStr === '') return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(currentLanguage === 'en' ? 'en-US' : 'es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  const sectionStyle: CSSProperties = {
    backgroundColor: 'var(--color-neutral-0, #ffffff)',
    border: '1px solid var(--color-neutral-200, #e5e7eb)',
    borderRadius: 'var(--radius-lg, 12px)',
    padding: '24px',
    marginTop: '24px',
  };

  const headerRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-neutral-900, #111827)',
    margin: 0,
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  };

  const fieldGroupStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const labelStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-neutral-500, #6b7280)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const valueStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--color-neutral-900, #111827)',
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--color-neutral-300, #d1d5db)',
    borderRadius: 'var(--radius-md, 8px)',
    fontSize: '14px',
    color: 'var(--color-neutral-900, #111827)',
    backgroundColor: 'var(--color-neutral-0, #ffffff)',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const primaryBtnStyle: CSSProperties = {
    padding: '8px 16px',
    backgroundColor: 'var(--color-primary-600, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-md, 8px)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  };

  const cancelBtnStyle: CSSProperties = {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: 'var(--color-neutral-600, #4b5563)',
    border: '1px solid var(--color-neutral-300, #d1d5db)',
    borderRadius: 'var(--radius-md, 8px)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    marginRight: '8px',
  };

  const dividerStyle: CSSProperties = {
    borderTop: '1px solid var(--color-neutral-100, #f3f4f6)',
    margin: '20px 0',
  };

  const fieldErrorStyle: CSSProperties = {
    color: 'var(--color-error-600, #dc2626)',
    fontSize: '12px',
    lineHeight: 1.35,
  };

  // ── Loading / error states ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={sectionStyle}>
        <div
          style={{
            textAlign: 'center',
            color: 'var(--color-neutral-400, #9ca3af)',
            padding: '20px 0',
          }}
        >
          {t('Loading profile...', 'Cargando perfil...')}
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div style={sectionStyle}>
        <div
          style={{
            textAlign: 'center',
            color: 'var(--color-neutral-400, #9ca3af)',
            padding: '20px 0',
          }}
        >
          {t('Could not load profile information.', 'No se pudo cargar la información del perfil.')}
        </div>
      </div>
    );
  }

  // ── Avatar block (shared between read and edit views) ───────────────────────

  const hasAvatar = typeof profile.avatarUrl === 'string' && profile.avatarUrl.trim() !== '';

  const avatarBlock = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--color-neutral-100, #f3f4f6)',
      }}
    >
      {/* Avatar circle */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleAvatarClick}
          onMouseEnter={() => {
            setIsAvatarHovered(true);
          }}
          onMouseLeave={() => {
            setIsAvatarHovered(false);
          }}
          disabled={isUploadingAvatar || isDeletingAvatar}
          aria-label={t('Change profile photo', 'Cambiar foto de perfil')}
          style={{
            position: 'relative',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--color-neutral-200, #e5e7eb)',
            padding: 0,
            cursor: isUploadingAvatar || isDeletingAvatar ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--color-primary-100, #dbeafe)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {hasAvatar ? (
            <img
              src={profile.avatarUrl as string}
              alt={t('Profile photo', 'Foto de perfil')}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-primary-700, #1d4ed8)',
                userSelect: 'none',
              }}
            >
              {getInitials(profile.firstName, profile.lastName)}
            </span>
          )}

          {/* Hover overlay */}
          {(isAvatarHovered || isUploadingAvatar) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {isUploadingAvatar ? (
                <span
                  style={{ fontSize: '10px', color: '#fff', fontWeight: 600, textAlign: 'center' }}
                >
                  {t('Uploading...', 'Subiendo...')}
                </span>
              ) : (
                <>
                  {/* Camera icon */}
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
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span
                    style={{ fontSize: '9px', color: '#fff', fontWeight: 600, textAlign: 'center' }}
                  >
                    {t('Change', 'Cambiar')}
                  </span>
                </>
              )}
            </div>
          )}
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            void handleAvatarFileChange(e);
          }}
        />
      </div>

      {/* Name + avatar actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-neutral-900, #111827)',
          }}
        >
          {profile.firstName} {profile.lastName}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-neutral-500, #6b7280)' }}>
          {profile.email}
        </p>

        {/* Avatar action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar || isDeletingAvatar}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-primary-600, #2563eb)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: isUploadingAvatar || isDeletingAvatar ? 'not-allowed' : 'pointer',
              opacity: isUploadingAvatar || isDeletingAvatar ? 0.5 : 1,
            }}
          >
            {isUploadingAvatar
              ? t('Uploading...', 'Subiendo...')
              : t('Change photo', 'Cambiar foto')}
          </button>

          {hasAvatar && (
            <>
              <span style={{ color: 'var(--color-neutral-300, #d1d5db)', fontSize: '12px' }}>
                |
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteAvatar();
                }}
                disabled={isUploadingAvatar || isDeletingAvatar}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-error-600, #dc2626)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: isUploadingAvatar || isDeletingAvatar ? 'not-allowed' : 'pointer',
                  opacity: isUploadingAvatar || isDeletingAvatar ? 0.5 : 1,
                }}
              >
                {isDeletingAvatar ? t('Removing...', 'Eliminando...') : t('Remove', 'Eliminar')}
              </button>
            </>
          )}
        </div>

        {avatarError !== null && (
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-error-600, #dc2626)' }}>
            {avatarError}
          </p>
        )}
      </div>
    </div>
  );

  // ── Edit form ───────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <div style={sectionStyle}>
        <div style={headerRowStyle}>
          <h2 style={titleStyle}>{t('Personal Information', 'Información Personal')}</h2>
        </div>

        {avatarBlock}

        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
        >
          <div style={gridStyle}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="pi-firstName">
                {t('First Name', 'Nombre')}
              </label>
              <input
                id="pi-firstName"
                style={{
                  ...inputStyle,
                  border:
                    translatedFormErrors.firstName !== undefined
                      ? '1px solid var(--color-error-500, #ef4444)'
                      : inputStyle.border,
                }}
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
              />
              {translatedFormErrors.firstName !== undefined && (
                <span style={fieldErrorStyle}>* {translatedFormErrors.firstName}</span>
              )}
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="pi-lastName">
                {t('Last Name', 'Apellido')}
              </label>
              <input
                id="pi-lastName"
                style={{
                  ...inputStyle,
                  border:
                    translatedFormErrors.lastName !== undefined
                      ? '1px solid var(--color-error-500, #ef4444)'
                      : inputStyle.border,
                }}
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                autoComplete="family-name"
              />
              {translatedFormErrors.lastName !== undefined && (
                <span style={fieldErrorStyle}>* {translatedFormErrors.lastName}</span>
              )}
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="pi-email">
                {t('Email', 'Correo electrónico')}
              </label>
              <input
                id="pi-email"
                style={{
                  ...inputStyle,
                  border:
                    translatedFormErrors.email !== undefined
                      ? '1px solid var(--color-error-500, #ef4444)'
                      : inputStyle.border,
                }}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              {translatedFormErrors.email !== undefined && (
                <span style={fieldErrorStyle}>* {translatedFormErrors.email}</span>
              )}
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="pi-phone">
                {t('Phone', 'Teléfono')}
              </label>
              <input
                id="pi-phone"
                style={{
                  ...inputStyle,
                  border:
                    translatedFormErrors.phoneNumber !== undefined
                      ? '1px solid var(--color-error-500, #ef4444)'
                      : inputStyle.border,
                }}
                type="tel"
                name="phoneNumber"
                value={form.phoneNumber}
                placeholder={phonePlaceholder}
                onChange={handleChange}
                autoComplete="tel"
              />
              {translatedFormErrors.phoneNumber !== undefined && (
                <span style={fieldErrorStyle}>* {translatedFormErrors.phoneNumber}</span>
              )}
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="pi-birthday">
                {t('Birthday', 'Fecha de nacimiento')}
              </label>
              <input
                id="pi-birthday"
                style={{
                  ...inputStyle,
                  border:
                    translatedFormErrors.birthday !== undefined
                      ? '1px solid var(--color-error-500, #ef4444)'
                      : inputStyle.border,
                }}
                type="date"
                name="birthday"
                value={form.birthday}
                max={adultMaxDate}
                onChange={handleChange}
              />
              {translatedFormErrors.birthday !== undefined && (
                <span style={fieldErrorStyle}>* {translatedFormErrors.birthday}</span>
              )}
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="pi-country">
                {t('Nationality', 'Nacionalidad')}
              </label>
              <select
                id="pi-country"
                style={{
                  ...inputStyle,
                  border:
                    translatedFormErrors.countryCode !== undefined
                      ? '1px solid var(--color-error-500, #ef4444)'
                      : inputStyle.border,
                }}
                name="countryCode"
                value={form.countryCode}
                onChange={handleChange}
              >
                <option value="">{t('Select...', 'Seleccionar...')}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {currentLanguage === 'en' ? c.name_en : c.name_es}
                  </option>
                ))}
              </select>
              {translatedFormErrors.countryCode !== undefined && (
                <span style={fieldErrorStyle}>* {translatedFormErrors.countryCode}</span>
              )}
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="pi-idType">
                {t('ID Type', 'Tipo de identificación')}
              </label>
              <select
                id="pi-idType"
                style={inputStyle}
                name="identificationTypeId"
                value={form.identificationTypeId}
                onChange={handleChange}
                disabled={form.countryCode === ''}
              >
                <option value="">
                  {form.countryCode === ''
                    ? t('Select a nationality first', 'Selecciona una nacionalidad primero')
                    : t('Select...', 'Seleccionar...')}
                </option>
                {idTypes.map((idType) => (
                  <option key={idType.id} value={idType.id}>
                    {currentLanguage === 'en' ? idType.name_en : idType.name_es}
                  </option>
                ))}
              </select>
              {translatedFormErrors.identificationTypeId !== undefined && (
                <span style={fieldErrorStyle}>* {translatedFormErrors.identificationTypeId}</span>
              )}
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle} htmlFor="pi-idNumber">
                {t('ID Number', 'Número de identificación')}
              </label>
              <input
                id="pi-idNumber"
                style={{
                  ...inputStyle,
                  border:
                    translatedFormErrors.identificationNumber !== undefined
                      ? '1px solid var(--color-error-500, #ef4444)'
                      : inputStyle.border,
                }}
                type="text"
                name="identificationNumber"
                value={form.identificationNumber}
                onChange={handleChange}
                autoComplete="off"
              />
              {translatedFormErrors.identificationNumber !== undefined && (
                <span style={fieldErrorStyle}>* {translatedFormErrors.identificationNumber}</span>
              )}
            </div>
          </div>

          <div style={dividerStyle} />

          {resolvedSaveError !== null && (
            <div
              style={{
                marginTop: '16px',
                padding: '10px 14px',
                backgroundColor: 'var(--color-error-50, #fef2f2)',
                border: '1px solid var(--color-error-300, #fca5a5)',
                borderRadius: 'var(--radius-md, 8px)',
                color: 'var(--color-error-700, #b91c1c)',
                fontSize: '13px',
              }}
            >
              {resolvedSaveError}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" style={cancelBtnStyle} onClick={handleCancel}>
              {t('Cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              style={{
                ...primaryBtnStyle,
                opacity:
                  isSaving || originalProfile === null || !hasChanges(form, originalProfile)
                    ? 0.7
                    : 1,
              }}
              disabled={isSaving || originalProfile === null || !hasChanges(form, originalProfile)}
            >
              {isSaving ? t('Saving...', 'Guardando...') : t('Save Changes', 'Guardar cambios')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Read-only view ──────────────────────────────────────────────────────────

  return (
    <div style={sectionStyle}>
      <div style={headerRowStyle}>
        <h2 style={titleStyle}>{t('Personal Information', 'Información Personal')}</h2>
        <button
          type="button"
          style={{
            ...primaryBtnStyle,
            opacity: termsAccepted ? 1 : 0.45,
            cursor: termsAccepted ? 'pointer' : 'not-allowed',
          }}
          onClick={
            termsAccepted
              ? () => {
                  handleEdit();
                }
              : undefined
          }
          disabled={!termsAccepted}
          title={
            termsAccepted
              ? undefined
              : t(
                  'Accept the terms and conditions to edit your profile',
                  'Acepta los términos y condiciones para editar tu perfil'
                )
          }
        >
          {t('Edit', 'Editar')}
        </button>
      </div>

      {saveSuccess && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            backgroundColor: 'var(--color-success-50, #f0fdf4)',
            border: '1px solid var(--color-success-300, #86efac)',
            borderRadius: 'var(--radius-md, 8px)',
            color: 'var(--color-success-700, #15803d)',
            fontSize: '13px',
          }}
        >
          {t('Profile updated successfully.', 'Perfil actualizado correctamente.')}
        </div>
      )}

      {avatarBlock}

      <div style={gridStyle}>
        <div style={fieldGroupStyle}>
          <span style={labelStyle}>{t('First Name', 'Nombre')}</span>
          <span style={valueStyle}>{profile.firstName}</span>
        </div>

        <div style={fieldGroupStyle}>
          <span style={labelStyle}>{t('Last Name', 'Apellido')}</span>
          <span style={valueStyle}>{profile.lastName}</span>
        </div>

        <div style={fieldGroupStyle}>
          <span style={labelStyle}>{t('Email', 'Correo electrónico')}</span>
          <span style={valueStyle}>{profile.email}</span>
        </div>

        <div style={fieldGroupStyle}>
          <span style={labelStyle}>{t('Phone', 'Teléfono')}</span>
          <span style={valueStyle}>{profile.phoneNumber ?? '—'}</span>
        </div>

        <div style={fieldGroupStyle}>
          <span style={labelStyle}>{t('Birthday', 'Fecha de nacimiento')}</span>
          <span style={valueStyle}>{formatDate(profile.birthday)}</span>
        </div>

        <div style={fieldGroupStyle}>
          <span style={labelStyle}>{t('Nationality', 'Nacionalidad')}</span>
          <span style={valueStyle}>{getLocalityName(profile) || '—'}</span>
        </div>

        <div style={fieldGroupStyle}>
          <span style={labelStyle}>{t('ID Type', 'Tipo de identificación')}</span>
          <span style={valueStyle}>{getIdTypeName(profile)}</span>
        </div>

        <div style={fieldGroupStyle}>
          <span style={labelStyle}>{t('ID Number', 'Número de identificación')}</span>
          <span style={valueStyle}>{profile.identificationNumber ?? '—'}</span>
        </div>
      </div>

      <div style={dividerStyle} />

      {/* Terms & Conditions — interactive checkbox */}
      <div style={fieldGroupStyle}>
        <span style={labelStyle}>{t('Terms & Conditions', 'Términos y Condiciones')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input
            id="pi-readonly-terms-check"
            type="checkbox"
            checked={termsAccepted}
            disabled
            style={{ width: '16px', height: '16px', cursor: 'not-allowed', flexShrink: 0 }}
          />
          <label
            htmlFor="pi-readonly-terms-check"
            style={{ fontSize: '13px', color: '#374151', cursor: 'default', userSelect: 'none' }}
          >
            {t('I accept the terms and conditions of', 'Acepto los términos y condiciones de')}{' '}
            <strong>{PLATFORM_NAME}</strong>
          </label>
          <button
            type="button"
            onClick={() => {
              setTermsModalError(null);
              setShowTermsModal(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '13px',
              color: 'var(--color-primary-600, #2563eb)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 500,
            }}
          >
            {t('View terms & conditions', 'Ver términos y condiciones')}
          </button>
        </div>
      </div>

      {showTermsModal && (
        <TermsModal
          language={currentLanguage}
          onAccept={() => {
            void handleAcceptTermsFromModal();
          }}
          onClose={() => {
            setTermsModalError(null);
            setShowTermsModal(false);
          }}
          isAlreadyAccepted={termsAccepted}
          isAccepting={isAcceptingTerms}
          acceptError={termsModalError}
        />
      )}
    </div>
  );
}
