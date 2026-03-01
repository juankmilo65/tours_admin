/**
 * Create Booking Modal Component
 * Follows the same pattern as CreateTourModal
 */

import React from 'react';
import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { createBookingBusiness } from '~/server/businessLogic/bookingsBusinessLogic';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectCurrentUser } from '~/store/slices/authSlice';
import { openModal, closeModal, setGlobalLoading } from '~/store/slices/uiSlice';
import { getToursDropdownBusiness } from '~/server/businessLogic/toursBusinessLogic';
import { getCountries } from '~/server/countries';
import { getUsersDropdownBusiness } from '~/server/businessLogic/usersBusinessLogic';
import { Input } from '~/components/ui/Input';
import Select from '~/components/ui/Select';

// The dropdown endpoint returns minimal tour info (same as offers)
// so we only care about localized titles and the id.  Pricing/capacity
// aren't available here and were causing lots of `undefined` values in the
// select options when we tried to reference them.
interface TourOption {
  id: string;
  title_es: string;
  title_en: string;
}

interface CountryOption {
  id: string;
  name: string;
  code: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface CreateBookingModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface BookingFormData {
  tourId: string;
  userId: string;
  startDate: string;
  endDate: string;
  numberOfPeople: number;
  firstName1: string;
  lastName1: string;
  firstName2: string;
  lastName2: string;
  email: string;
  phone: string;
  countryId: string;
  offerId?: string;
}

export function CreateBookingModal({
  isOpen,
  onSuccess,
  onClose,
}: CreateBookingModalProps): JSX.Element | null {
  const { t, language } = useTranslation();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectCurrentUser);

  const [tours, setTours] = useState<TourOption[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [formData, setFormData] = useState<BookingFormData>({
    tourId: '',
    userId: currentUser?.id ?? '',
    startDate: '',
    endDate: '',
    numberOfPeople: 1,
    firstName1: '',
    lastName1: '',
    firstName2: '',
    lastName2: '',
    email: '',
    phone: '',
    countryId: '',
    offerId: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ask backend for same language that the UI is using so titles are
        // already localized (matches the logic in the offers route)
        const [toursData, countriesData, usersData] = await Promise.all([
          getToursDropdownBusiness(null, language),
          getCountries(),
          getUsersDropdownBusiness(token ?? undefined, language),
        ]);

        // the backend response for dropdown contains objects with
        // id/title_es/title_en (not the custom shape we previously
        // defined).  Cast accordingly and then store the raw results so
        // our select mapping can use the right properties.
        const toursResult = toursData as { success?: boolean; data?: TourOption[] };
        const usersResult = usersData as { success?: boolean; data?: UserOption[] };

        if (toursResult.success === true && toursResult.data !== undefined) {
          setTours(toursResult.data);
        }

        if (
          countriesData !== undefined &&
          typeof countriesData === 'object' &&
          countriesData !== null &&
          'data' in countriesData &&
          Array.isArray(countriesData.data)
        ) {
          setCountries(countriesData.data as CountryOption[]);
        }

        if (usersResult.success === true && usersResult.data !== undefined) {
          setUsers(usersResult.data);
        }
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };

    void fetchData();
  }, [token, language]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number.parseFloat(value) : value,
    }));

    // Clear error for this field
    if (errors[name as keyof BookingFormData] !== undefined) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BookingFormData, string>> = {};

    if (!formData.tourId) newErrors.tourId = t('tours.tourRequired') ?? 'Tour is required';
    if (!formData.userId) newErrors.userId = t('validation.required') ?? 'Required';
    if (!formData.startDate) newErrors.startDate = t('validation.required') ?? 'Required';
    if (!formData.endDate) newErrors.endDate = t('validation.required') ?? 'Required';
    if (!formData.numberOfPeople || formData.numberOfPeople < 1)
      newErrors.numberOfPeople = t('validation.required') ?? 'Required';
    if (!formData.firstName1) newErrors.firstName1 = t('validation.required') ?? 'Required';
    if (!formData.lastName1) newErrors.lastName1 = t('validation.required') ?? 'Required';
    if (!formData.email) newErrors.email = t('auth.emailRequired') ?? 'Email is required';
    if (!formData.countryId) newErrors.countryId = t('common.selectCountry') ?? 'Select country';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Show global spinner
    dispatch(
      setGlobalLoading({
        isLoading: true,
        message: t('bookings.sectionTitle') ?? 'Creating booking...',
      })
    );

    try {
      const result = await createBookingBusiness(formData, token ?? '');

      if (!result.success) {
        // Hide global spinner on error
        dispatch(setGlobalLoading({ isLoading: false }));
        dispatch(
          openModal({
            id: 'create-booking-error',
            type: 'confirm',
            title: t('common.error'),
            isOpen: true,
            data: {
              message: result.message ?? t('bookings.newBooking') ?? 'Error creating booking',
              icon: 'alert',
            },
          })
        );
        setIsSubmitting(false);
        return;
      }

      // Success
      dispatch(closeModal('create-booking'));
      if (onSuccess !== undefined) {
        onSuccess();
      }

      dispatch(
        openModal({
          id: 'create-booking-success',
          type: 'confirm',
          title: t('common.success'),
          isOpen: true,
          data: {
            message: t('bookings.sectionTitle') ?? 'Booking created successfully',
            icon: 'success',
          },
        })
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      // Hide global spinner on error
      dispatch(setGlobalLoading({ isLoading: false }));
      dispatch(
        openModal({
          id: 'create-booking-error',
          type: 'confirm',
          title: t('common.error'),
          isOpen: true,
          data: {
            message: t('bookings.newBooking') ?? 'Error creating booking',
            icon: 'alert',
          },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 'var(--space-4)',
      }}
      onClick={(e) => {
        if (e.currentTarget === e.target && onClose !== undefined) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 'var(--space-8)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-neutral-900)',
              margin: 0,
            }}
          >
            {t('bookings.newBooking') ?? 'New Booking'}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (onClose !== undefined) onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-neutral-500)',
              padding: 'var(--space-1)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s, background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-700)';
              e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-500)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label={t('common.close') ?? 'Cerrar'}
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Tour Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('bookings.tour')} <span style={{ color: 'red' }}>*</span>
              </label>
              <Select
                options={[
                  { value: '', label: t('tours.selectTour') ?? 'Select tour' },
                  ...tours.map((tour) => ({
                    value: tour.id,
                    label: language === 'en' ? tour.title_en : tour.title_es,
                  })),
                ]}
                value={formData.tourId}
                onChange={(value: string) => {
                  setFormData((prev) => ({ ...prev, tourId: value }));
                  if (errors.tourId !== undefined) {
                    setErrors((prev) => ({ ...prev, tourId: undefined }));
                  }
                }}
                placeholder={t('tours.selectTour') ?? 'Select tour'}
                id="select-tour"
              />
              {errors.tourId !== undefined && (
                <span
                  style={{
                    color: 'red',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                  }}
                >
                  {errors.tourId}
                </span>
              )}
            </div>

            {/* User Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('users.user')} <span style={{ color: 'red' }}>*</span>
              </label>
              <Select
                options={[
                  { value: '', label: t('users.allUsers') ?? 'Select user' },
                  ...users.map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`,
                  })),
                ]}
                value={formData.userId}
                onChange={(value: string) => {
                  setFormData((prev) => ({ ...prev, userId: value }));
                  if (errors.userId !== undefined) {
                    setErrors((prev) => ({ ...prev, userId: undefined }));
                  }
                }}
                placeholder={t('users.allUsers') ?? 'Select user'}
                id="select-user"
              />
              {errors.userId !== undefined && (
                <span
                  style={{
                    color: 'red',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                  }}
                >
                  {errors.userId}
                </span>
              )}
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('bookings.startDate')} <span style={{ color: 'red' }}>*</span>
                </label>
                <Input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  error={errors.startDate}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('bookings.endDate')} <span style={{ color: 'red' }}>*</span>
                </label>
                <Input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  error={errors.endDate}
                />
              </div>
            </div>

            {/* Number of People */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('bookings.numberOfPeople')} <span style={{ color: 'red' }}>*</span>
              </label>
              <Input
                type="number"
                name="numberOfPeople"
                value={formData.numberOfPeople}
                onChange={handleInputChange}
                min={1}
                required
                error={errors.numberOfPeople}
              />
            </div>

            {/* Customer Information */}
            <div style={{ marginTop: 'var(--space-2)' }}>
              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-neutral-900)',
                  marginBottom: 'var(--space-4)',
                  margin: 0,
                }}
              >
                {t('bookings.customer') ?? 'Customer Information'}
              </h3>

              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 'var(--space-2)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-neutral-700)',
                    }}
                  >
                    {t('users.firstName')} 1 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <Input
                    type="text"
                    name="firstName1"
                    value={formData.firstName1}
                    onChange={handleInputChange}
                    required
                    error={errors.firstName1}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 'var(--space-2)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-neutral-700)',
                    }}
                  >
                    {t('users.lastName')} 1 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <Input
                    type="text"
                    name="lastName1"
                    value={formData.lastName1}
                    onChange={handleInputChange}
                    required
                    error={errors.lastName1}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)',
                  marginTop: 'var(--space-4)',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 'var(--space-2)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-neutral-700)',
                    }}
                  >
                    {t('users.firstName')} 2
                  </label>
                  <Input
                    type="text"
                    name="firstName2"
                    value={formData.firstName2}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 'var(--space-2)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-neutral-700)',
                    }}
                  >
                    {t('users.lastName')} 2
                  </label>
                  <Input
                    type="text"
                    name="lastName2"
                    value={formData.lastName2}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('common.email')} <span style={{ color: 'red' }}>*</span>
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  error={errors.email}
                />
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('common.phone')}
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('common.country')} <span style={{ color: 'red' }}>*</span>
                </label>
                <Select
                  options={[
                    { value: '', label: t('common.selectCountry') ?? 'Select country' },
                    ...countries.map((country) => ({
                      value: country.id,
                      label: country.name,
                    })),
                  ]}
                  value={formData.countryId}
                  onChange={(value: string) => {
                    setFormData((prev) => ({ ...prev, countryId: value }));
                    if (errors.countryId !== undefined) {
                      setErrors((prev) => ({ ...prev, countryId: undefined }));
                    }
                  }}
                  placeholder={t('common.selectCountry') ?? 'Select country'}
                  id="select-country"
                />
                {errors.countryId !== undefined && (
                  <span
                    style={{
                      color: 'red',
                      fontSize: 'var(--text-xs)',
                      marginTop: 'var(--space-1)',
                      display: 'block',
                    }}
                  >
                    {errors.countryId}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                justifyContent: 'flex-end',
                marginTop: 'var(--space-6)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--color-neutral-200)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (onClose !== undefined) onClose();
                }}
                disabled={isSubmitting}
                style={{
                  padding: 'var(--space-2) var(--space-6)',
                  backgroundColor: 'var(--color-neutral-200)',
                  color: 'var(--color-neutral-700)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: 'var(--space-2) var(--space-6)',
                  backgroundColor: isSubmitting
                    ? 'var(--color-neutral-400)'
                    : 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {isSubmitting ? t('common.saving') : t('bookings.newBooking')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
