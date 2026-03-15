/**
 * Create Booking Modal Component
 * Follows same pattern as CreateTourModal with dynamic client list
 */

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { createBookingBusiness } from '~/server/businessLogic/bookingsBusinessLogic';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectAuth } from '~/store/slices/authSlice';
import { openModal, setGlobalLoading } from '~/store/slices/uiSlice';
import {
  getToursDropdownBusiness,
  getTourHourRangeBusiness,
  getTourByIdBusiness,
} from '~/server/businessLogic/toursBusinessLogic';
import {
  useDropdownCache,
  useCachedNationalities,
  useAllCachedIdentificationTypes,
} from '~/hooks/useDropdownCache';
import { Input } from '~/components/ui/Input';
import Select from '~/components/ui/Select';
import type { Client } from '~/types/booking';
import {
  getMinimumBookingDate,
  getTimezoneForCountry,
  buildDateTimeInTimezone,
} from '~/utilities/timezoneValidation';
import { getTourAvailabilityBusiness } from '~/server/businessLogic/tourAvailabilityBusinessLogic';
import { TourAvailabilityDisplay } from '~/components/bookings/TourAvailabilityDisplay';
import type { TourAvailabilityData } from '~/types/tourAvailability';

// The dropdown endpoint returns minimal tour info (same as offers)
interface TourOption {
  id: string;
  title_es: string;
  title_en: string;
}

interface CreateBookingModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface BookingFormData {
  tourId: string;
  startDate: string;
  endDate: string;
  currency: string;
  clients: Client[];
  specialRequests?: string;
}

export function CreateBookingModal({
  isOpen,
  onSuccess,
  onClose,
}: CreateBookingModalProps): JSX.Element | null {
  const { t, language } = useTranslation();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectAuth).user;

  const [isBookingForMe, setIsBookingForMe] = useState(false);

  const [tours, setTours] = useState<TourOption[]>([]);
  const [clientNationalities, setClientNationalities] = useState<Record<number, string>>({});
  const [hourRange, setHourRange] = useState<string | null>(null);
  const [isLoadingHourRange, setIsLoadingHourRange] = useState(false);
  const [tourDaysCount, setTourDaysCount] = useState<number | null>(null);
  const [minBookingDate, setMinBookingDate] = useState<string>('');
  const [tourCountryCode, setTourCountryCode] = useState<string>('');
  const [tourAvailability, setTourAvailability] = useState<TourAvailabilityData | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>('');

  // Cache-first dropdown loaders
  const { loadNationalities, loadIdentificationTypes } = useDropdownCache();
  const countries = useCachedNationalities(language);
  const allIdTypesByCountry = useAllCachedIdentificationTypes();

  const [formData, setFormData] = useState<BookingFormData>({
    tourId: '',
    startDate: '',
    endDate: '',
    currency: 'MXN',
    clients: [{ clientName: '', clientAge: 0, identificationTypeId: '', clientId: '' }],
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSpecialRequests, setHasSpecialRequests] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Load nationality dropdown into cache when modal opens or language changes
  useEffect(() => {
    void loadNationalities(language);
  }, [isOpen, language, loadNationalities]);

  // Fetch tours on mount
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const toursData = await getToursDropdownBusiness(null, language);
        const toursResult = toursData as { success?: boolean; data?: TourOption[] };

        if (toursResult.success === true && toursResult.data !== undefined) {
          setTours(toursResult.data);
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      }
    };

    void fetchTours();
  }, [language]);

  // Check tour availability when dates are selected
  useEffect(() => {
    if (
      formData.tourId === '' ||
      formData.startDate === '' ||
      formData.endDate === '' ||
      token === null ||
      token === ''
    ) {
      setTourAvailability(null);
      setAvailabilityError('');
      return;
    }
    const checkAvailability = async () => {
      setIsLoadingAvailability(true);
      setAvailabilityError('');
      try {
        const result = await getTourAvailabilityBusiness(
          formData.tourId,
          formData.startDate,
          formData.endDate,
          token
        );
        if (result.success && result.data !== undefined) {
          setTourAvailability(result.data);
          setAvailabilityError('');
        } else {
          setTourAvailability(null);
          setAvailabilityError(result.message ?? 'Failed to check availability');
        }
      } catch {
        setTourAvailability(null);
        setAvailabilityError('Failed to check availability');
      } finally {
        setIsLoadingAvailability(false);
      }
    };
    void checkAvailability();
  }, [formData.tourId, formData.startDate, formData.endDate, token]);

  // Fetch hour range when tour selection changes
  useEffect(() => {
    if (formData.tourId === '' || token === null || token === '') {
      setHourRange(null);
      setMinBookingDate('');
      setTourDaysCount(null);
      return;
    }
    const fetchTourDetails = async () => {
      setIsLoadingHourRange(true);
      try {
        // Fetch hour range
        const hourRangeResult = await getTourHourRangeBusiness(formData.tourId, token, language);
        const newHourRange = hourRangeResult.success
          ? (hourRangeResult.data?.hourRange ?? null)
          : null;
        setHourRange(newHourRange);
        setTourDaysCount(
          hourRangeResult.success ? (hourRangeResult.data?.daysCount ?? null) : null
        );

        // Fetch tour details to get country code
        const tourResult = (await getTourByIdBusiness(formData.tourId, language, 'MXN', token)) as {
          success?: boolean;
          data?: { city?: { countryId?: string } };
        };
        if (tourResult.success === true && tourResult.data?.city?.countryId !== undefined) {
          const countryCode = tourResult.data.city.countryId;
          setTourCountryCode(countryCode);

          // Calculate minimum booking date if we have tour start time
          if (newHourRange !== null) {
            const startTime = newHourRange.split(' - ')[0] ?? '';
            const minDate = getMinimumBookingDate(startTime, countryCode);
            setMinBookingDate(minDate);
          } else {
            setMinBookingDate('');
          }
        } else {
          setTourCountryCode('');
          setMinBookingDate('');
        }
      } catch {
        setHourRange(null);
        setMinBookingDate('');
        setTourCountryCode('');
        setTourDaysCount(null);
      } finally {
        setIsLoadingHourRange(false);
      }
    };
    void fetchTourDetails();
  }, [formData.tourId, token, language]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value, type } = e.target;

    // Clear API error on any form change
    if (apiError !== null) setApiError(null);

    if (name === 'startDate' && tourDaysCount !== null && tourDaysCount > 0 && value !== '') {
      const start = new Date(value);
      start.setDate(start.getDate() + (tourDaysCount - 1));
      const endDate = start.toISOString().split('T')[0] ?? '';
      setFormData((prev) => ({ ...prev, startDate: value, endDate }));
      if (errors.startDate !== undefined || errors.endDate !== undefined) {
        setErrors((prev) => ({ ...prev, startDate: undefined, endDate: undefined }));
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number.parseFloat(value) : value,
    }));

    // Clear error for this field
    if (errors[name] !== undefined) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle client field changes
  const handleClientChange = (index: number, field: keyof Client, value: string | number): void => {
    const newClients = [...formData.clients];
    const currentClient = newClients[index];
    if (currentClient !== undefined) {
      let finalValue: string | number;

      if (field === 'clientAge') {
        finalValue = typeof value === 'number' ? value : Number(value);
      } else if (field === 'identificationTypeId' || field === 'clientId') {
        finalValue = String(value);
      } else {
        finalValue = value;
      }

      const updatedClient: Client = {
        ...currentClient,
        [field]: finalValue,
      };
      newClients[index] = updatedClient;
    }

    setFormData((prev) => ({ ...prev, clients: newClients }));

    // Clear error for this client field
    const errorKey = `clients.${index}.${field}`;
    if (errors[errorKey] !== undefined) {
      setErrors((prev) => ({ ...prev, [errorKey]: undefined }));
    }
    // Clear group-level minor-without-adult error when any age changes
    if (field === 'clientAge' && errors['clients.minorWithoutAdult'] !== undefined) {
      setErrors((prev) => ({ ...prev, 'clients.minorWithoutAdult': undefined }));
    }
  };

  // Mark one client as primary (radio-button behaviour)
  const handleSetPrimary = (index: number): void => {
    setFormData((prev) => ({
      ...prev,
      clients: prev.clients.map((c, i) => ({ ...c, isPrimary: i === index })),
    }));
    // If the user manually sets a different client as primary, un-tick the "for me" checkbox
    if (index !== 0) {
      setIsBookingForMe(false);
    }
    if (errors.primaryClient !== undefined) {
      setErrors((prev) => ({ ...prev, primaryClient: undefined }));
    }
  };

  // Add a new client
  const handleAddClient = (): void => {
    const newClient: Client = {
      clientName: '',
      clientAge: 0,
      identificationTypeId: '',
      clientId: '',
    };
    setFormData((prev) => ({
      ...prev,
      clients: [...prev.clients, newClient],
    }));

    // Clear any clients error
    if (errors.clients !== undefined) {
      setErrors((prev) => ({ ...prev, clients: undefined }));
    }
  };

  // Handle nationality change per client
  const handleNationalityChange = (index: number, countryCode: string): void => {
    setClientNationalities((prev) => ({ ...prev, [index]: countryCode }));

    // Clear nationality error for this client
    const nationalityErrorKey = `clients.${index}.nationality`;
    if (errors[nationalityErrorKey] !== undefined) {
      setErrors((prev) => ({ ...prev, [nationalityErrorKey]: undefined }));
    }

    // Reset identificationTypeId for this client when nationality changes
    handleClientChange(index, 'identificationTypeId', '');

    // Load identification types for selected country via cache
    if (countryCode !== '') {
      void loadIdentificationTypes(countryCode, language);
    }
  };

  // Remove a client
  const handleRemoveClient = (index: number): void => {
    if (formData.clients.length <= 1) {
      // Don't remove last client
      return;
    }

    const newClients = formData.clients.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, clients: newClients }));

    // Reorder nationality map after removal
    setClientNationalities((prev) => {
      const updated: Record<number, string> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const keyNum = Number(key);
        if (keyNum < index) updated[keyNum] = val;
        else if (keyNum > index) updated[keyNum - 1] = val;
      });
      return updated;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};
    const clientLabel = (i: number) => `${t('bookings.clientName') ?? 'Client'} ${i + 1}`;

    // Validate primary client
    if (!formData.clients.some((c) => c.isPrimary === true)) {
      newErrors.primaryClient =
        t('bookings.noPrimaryClient') ?? 'Debes marcar un cliente como principal';
    }

    if (!formData.tourId) {
      newErrors.tourId = t('bookings.tours.tourRequired') ?? 'Tour is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = `${t('bookings.startDate') ?? 'Start Date'}: ${t('validation.required') ?? 'Required'}`;
    }

    if (!formData.endDate) {
      newErrors.endDate = `${t('bookings.endDate') ?? 'End Date'}: ${t('validation.required') ?? 'Required'}`;
    }

    // Validate dates: end date must be after or equal to start date
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate =
          t('bookings.endDateAfterStartDate') ??
          'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    // Validate currency
    if (!formData.currency || formData.currency.trim() === '') {
      newErrors.currency = `${t('bookings.currency') ?? 'Currency'}: ${t('validation.required') ?? 'Required'}`;
    }

    // Validate clients
    if (formData.clients.length === 0) {
      newErrors.clients = t('bookings.clientsRequired') ?? 'At least one client is required';
    } else {
      formData.clients.forEach((client, index) => {
        // Client Name validation
        if (!client.clientName || client.clientName.trim() === '') {
          newErrors[`clients.${index}.clientName`] =
            `${clientLabel(index)}: ${t('validation.required') ?? 'Required'}`;
        } else if (client.clientName.trim().length < 3) {
          newErrors[`clients.${index}.clientName`] =
            `${clientLabel(index)}: ${t('bookings.clientNameMinLength') ?? 'El nombre debe tener al menos 3 caracteres'}`;
        } else if (client.clientName.trim().length > 100) {
          newErrors[`clients.${index}.clientName`] =
            `${clientLabel(index)}: ${t('bookings.clientNameMaxLength') ?? 'El nombre no puede exceder 100 caracteres'}`;
        }

        // Client Age validation
        if (client.clientAge === undefined || client.clientAge === null) {
          newErrors[`clients.${index}.clientAge`] =
            `${clientLabel(index)} - ${t('bookings.clientAge') ?? 'Age'}: ${t('validation.required') ?? 'Required'}`;
        } else if (!Number.isInteger(client.clientAge)) {
          newErrors[`clients.${index}.clientAge`] =
            `${clientLabel(index)}: ${t('bookings.clientAgeInteger') ?? 'La edad debe ser un número entero'}`;
        } else if (client.clientAge < 0) {
          newErrors[`clients.${index}.clientAge`] =
            `${clientLabel(index)}: ${t('bookings.clientAgeMin') ?? 'La edad no puede ser negativa'}`;
        } else if (client.clientAge > 120) {
          newErrors[`clients.${index}.clientAge`] =
            `${clientLabel(index)}: ${t('bookings.clientAgeMax') ?? 'La edad no puede ser mayor a 120 años'}`;
        }

        // Nationality validation
        if ((clientNationalities[index] ?? '') === '') {
          newErrors[`clients.${index}.nationality`] =
            `${clientLabel(index)}: ${t('bookings.selectNationality') ?? 'Select nationality'}`;
        }

        // ID Type validation (only if nationality is selected)
        if (
          (clientNationalities[index] ?? '') !== '' &&
          (client.identificationTypeId ?? '').trim() === ''
        ) {
          newErrors[`clients.${index}.identificationTypeId`] =
            `${clientLabel(index)}: ${t('bookings.selectIdType') ?? 'Select ID type'}`;
        }

        // Client ID validation (only if ID type is selected)
        if (
          (client.identificationTypeId ?? '').trim() !== '' &&
          (client.clientId ?? '').trim() === ''
        ) {
          newErrors[`clients.${index}.clientId`] =
            `${clientLabel(index)}: ${t('bookings.enterClientId') ?? 'Enter client ID'}`;
        } else if (
          (client.clientId ?? '').trim() !== '' &&
          (client.clientId ?? '').trim().length < 3
        ) {
          newErrors[`clients.${index}.clientId`] =
            `${clientLabel(index)}: ${t('bookings.clientIdMinLength') ?? 'El ID debe tener al menos 3 caracteres'}`;
        } else if ((client.clientId ?? '').trim().length > 50) {
          newErrors[`clients.${index}.clientId`] =
            `${clientLabel(index)}: ${t('bookings.clientIdMaxLength') ?? 'El ID no puede exceder 50 caracteres'}`;
        }
      });

      // Group-level: if any client is a minor, at least one adult (18+) must be present
      const hasMinor = formData.clients.some(
        (c) => c.clientAge !== undefined && c.clientAge !== null && c.clientAge < 18
      );
      const hasAdult = formData.clients.some(
        (c) => c.clientAge !== undefined && c.clientAge !== null && c.clientAge >= 18
      );
      if (hasMinor && !hasAdult) {
        newErrors['clients.minorWithoutAdult'] =
          t('bookings.clientAgeUnder18') ??
          'Los menores de 18 años deben ser acompañados por un adulto';
      }
    }

    // Validate special requests (if checkbox is checked)
    if (hasSpecialRequests) {
      const specialRequests = formData.specialRequests ?? '';
      if (specialRequests.trim() === '') {
        newErrors.specialRequests =
          t('bookings.specialRequestsRequired') ??
          'Por favor ingresa tus solicitudes especiales o desmarca la casilla';
      } else if (specialRequests.trim().length < 10) {
        newErrors.specialRequests =
          t('bookings.specialRequestsMinLength') ??
          'Las solicitudes especiales deben tener al menos 10 caracteres';
      } else if (specialRequests.trim().length > 500) {
        newErrors.specialRequests =
          t('bookings.specialRequestsMaxLength') ??
          'Las solicitudes especiales no pueden exceder 500 caracteres';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      window.setTimeout(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
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
      // Combine date-only values with hour-range times, then build the payload
      const to24h = (time: string): string => {
        const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return time;
        let h = parseInt(match[1] ?? '0', 10);
        const m = match[2] ?? '00';
        const period = (match[3] ?? '').toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m}`;
      };

      const buildDateTime = (date: string, time: string): string => {
        if (!date) return '';
        const t24 = to24h(time);
        const tz = tourCountryCode ? getTimezoneForCountry(tourCountryCode) : 'UTC';
        return buildDateTimeInTimezone(date, t24, tz);
      };

      const [rangeStart, rangeEnd] =
        hourRange !== null ? hourRange.split(' - ') : ['00:00', '00:00'];

      const payloadWithCountry: BookingFormData = {
        ...formData,
        startDate: buildDateTime(formData.startDate, rangeStart ?? '00:00'),
        endDate: buildDateTime(formData.endDate, rangeEnd ?? '00:00'),
        clients: formData.clients.map((client, index) => ({
          ...client,
          countryCode: clientNationalities[index] ?? '',
        })),
        specialRequests: hasSpecialRequests ? (formData.specialRequests ?? '') : undefined,
      };

      const result = await createBookingBusiness(payloadWithCountry, token ?? '', language);
      if (!result.success) {
        dispatch(setGlobalLoading({ isLoading: false }));

        const errorMessage =
          result.message ?? t('bookings.createError') ?? 'Error creating booking';

        setApiError(errorMessage);
        setIsSubmitting(false);
        window.setTimeout(() => {
          errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }

      // Success — hide spinner, close this modal, notify parent, show success
      dispatch(setGlobalLoading({ isLoading: false }));
      if (onClose !== undefined) {
        onClose();
      }
      if (onSuccess !== undefined) {
        onSuccess();
      }

      dispatch(
        openModal({
          id: 'create-booking-success',
          type: 'confirm',
          title: t('common.success') ?? 'Success',
          isOpen: true,
          data: {
            message:
              result.message ?? t('bookings.createSuccess') ?? 'Booking created successfully',
            icon: 'success',
          },
        } as Parameters<typeof openModal>[0])
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      dispatch(setGlobalLoading({ isLoading: false }));
      setApiError(t('bookings.createError') ?? 'Error creating booking');
      window.setTimeout(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
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
          maxWidth: '1100px',
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
                  { value: '', label: t('bookings.tours.selectTour') ?? 'Select tour' },
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
                placeholder={t('bookings.tours.selectTour') ?? 'Select tour'}
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

            {/* Tour days count pill */}
            {tourDaysCount !== null && tourDaysCount > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-primary-50, #f0fdf4)',
                  border: '1px solid var(--color-primary-200, #bbf7d0)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-primary-700, #15803d)',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {language === 'en'
                  ? `This tour consists of ${tourDaysCount} day${tourDaysCount !== 1 ? 's' : ''}`
                  : `Este tour consta de ${tourDaysCount} día${tourDaysCount !== 1 ? 's' : ''}`}
              </div>
            )}

            {/* Dates */}
            <div>
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
                    {t('bookings.startDate')} <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      error={errors.startDate}
                      min={minBookingDate}
                      disabled={minBookingDate === ''}
                    />
                    {formData.tourId !== '' && (
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full, 9999px)',
                          whiteSpace: 'nowrap',
                          backgroundColor: isLoadingHourRange
                            ? 'var(--color-neutral-100)'
                            : hourRange !== null
                              ? 'var(--color-primary-50, #eff6ff)'
                              : 'var(--color-neutral-100)',
                          border: `1px solid ${
                            isLoadingHourRange
                              ? 'var(--color-neutral-200)'
                              : hourRange !== null
                                ? 'var(--color-primary-200, #bfdbfe)'
                                : 'var(--color-neutral-200)'
                          }`,
                          fontSize: 'var(--text-sm)',
                          color: isLoadingHourRange
                            ? 'var(--color-neutral-500)'
                            : hourRange !== null
                              ? 'var(--color-primary-700, #1d4ed8)'
                              : 'var(--color-neutral-500)',
                          fontWeight: 500,
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {isLoadingHourRange
                          ? language === 'en'
                            ? 'Loading...'
                            : 'Cargando...'
                          : (hourRange?.split(' - ')[0] ??
                            (language === 'en' ? 'No schedule' : 'Sin horario'))}
                      </div>
                    )}
                  </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      error={errors.endDate}
                      min={minBookingDate}
                      disabled={
                        minBookingDate === '' || (tourDaysCount !== null && tourDaysCount > 0)
                      }
                    />
                    {formData.tourId !== '' && (
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full, 9999px)',
                          whiteSpace: 'nowrap',
                          backgroundColor: isLoadingHourRange
                            ? 'var(--color-neutral-100)'
                            : hourRange !== null
                              ? 'var(--color-primary-50, #eff6ff)'
                              : 'var(--color-neutral-100)',
                          border: `1px solid ${
                            isLoadingHourRange
                              ? 'var(--color-neutral-200)'
                              : hourRange !== null
                                ? 'var(--color-primary-200, #bfdbfe)'
                                : 'var(--color-neutral-200)'
                          }`,
                          fontSize: 'var(--text-sm)',
                          color: isLoadingHourRange
                            ? 'var(--color-neutral-500)'
                            : hourRange !== null
                              ? 'var(--color-primary-700, #1d4ed8)'
                              : 'var(--color-neutral-500)',
                          fontWeight: 500,
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {isLoadingHourRange
                          ? language === 'en'
                            ? 'Loading...'
                            : 'Cargando...'
                          : (hourRange?.split(' - ')[1] ??
                            (language === 'en' ? 'No schedule' : 'Sin horario'))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tour Availability Display */}
            <TourAvailabilityDisplay
              availability={tourAvailability}
              isLoading={isLoadingAvailability}
              error={availabilityError}
            />

            {/* Currency */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('bookings.currency')} <span style={{ color: 'red' }}>*</span>
              </label>
              <Select
                options={[
                  { value: 'MXN', label: 'MXN - Mexican Peso' },
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                ]}
                value={formData.currency}
                onChange={(value: string) => {
                  setFormData((prev) => ({ ...prev, currency: value }));
                  if (errors.currency !== undefined) {
                    setErrors((prev) => ({ ...prev, currency: undefined }));
                  }
                }}
                placeholder={t('bookings.selectCurrency') ?? 'Select currency'}
                id="select-currency"
              />
              {errors.currency !== undefined && (
                <span
                  style={{
                    color: 'red',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                  }}
                >
                  {errors.currency}
                </span>
              )}
            </div>

            {/* Is this booking for me? */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isBookingForMe
                  ? 'var(--color-primary-50, #eff6ff)'
                  : 'var(--color-neutral-50)',
                border: `1px solid ${isBookingForMe ? 'var(--color-primary-200, #bfdbfe)' : 'var(--color-neutral-200)'}`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => {
                const next = !isBookingForMe;
                setIsBookingForMe(next);
                if (next && currentUser !== null) {
                  const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
                  setFormData((prev) => ({
                    ...prev,
                    clients: prev.clients.map((c, i) =>
                      i === 0
                        ? { ...c, clientName: fullName, isPrimary: true }
                        : { ...c, isPrimary: false }
                    ),
                  }));
                } else {
                  setFormData((prev) => ({
                    ...prev,
                    clients: prev.clients.map((c, i) =>
                      i === 0 ? { ...c, clientName: '', isPrimary: false } : c
                    ),
                  }));
                }
                if (errors.primaryClient !== undefined) {
                  setErrors((prev) => ({ ...prev, primaryClient: undefined }));
                }
              }}
            >
              <input
                type="checkbox"
                checked={isBookingForMe}
                onChange={() => undefined}
                style={{
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                  accentColor: 'var(--color-primary-500)',
                }}
              />
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-800)',
                }}
              >
                {t('bookings.bookingForMe') ?? '¿Esta reserva es para ti?'}
              </span>
              {isBookingForMe && currentUser !== null && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-primary-600, #2563eb)',
                    fontWeight: 500,
                  }}
                >
                  {`${currentUser.firstName} ${currentUser.lastName}`.trim()}
                </span>
              )}
            </div>

            {/* Clients */}
            <div style={{ marginTop: 'var(--space-2)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <h3
                  style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-neutral-900)',
                    margin: 0,
                  }}
                >
                  {t('bookings.clients') ?? 'Clients'}
                </h3>
                <button type="button" onClick={handleAddClient} className="modal-btn-add-client">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t('bookings.addClient') ?? 'Add Client'}
                </button>
              </div>

              {/* Clients List */}
              <div
                style={{
                  border: '1px solid var(--color-neutral-200)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-neutral-50)',
                    borderBottom: '1px solid var(--color-neutral-200)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 100px 180px 150px 150px 56px 40px',
                      gap: 'var(--space-3)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-neutral-600)',
                    }}
                  >
                    <div>#</div>
                    <div>{t('bookings.clientName') ?? 'Client Name'}</div>
                    <div>{t('bookings.clientAge') ?? 'Age'}</div>
                    <div>{t('bookings.nationality') ?? 'Nationality'}</div>
                    <div>{t('bookings.idType') ?? 'ID Type'}</div>
                    <div>{t('bookings.clientId') ?? 'Client ID'}</div>
                    <div style={{ textAlign: 'center' }}>
                      {t('bookings.isPrimary') ?? 'Principal'}
                    </div>
                    <div />
                  </div>
                </div>

                {formData.clients.map((client, index) => (
                  <div
                    key={`client-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 100px 180px 150px 150px 56px 40px',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      alignItems: 'center',
                      borderBottom:
                        index < formData.clients.length - 1
                          ? '1px solid var(--color-neutral-200)'
                          : 'none',
                      backgroundColor: index % 2 === 0 ? 'white' : 'var(--color-neutral-50)',
                    }}
                  >
                    {/* Index */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-neutral-600)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {index + 1}
                    </div>
                    {/* Client Name */}
                    <div>
                      <Input
                        type="text"
                        value={client.clientName}
                        onChange={(e) => handleClientChange(index, 'clientName', e.target.value)}
                        placeholder={t('bookings.clientNamePlaceholder') ?? 'Enter name'}
                        error={errors[`clients.${index}.clientName`]}
                        disabled={index === 0 && isBookingForMe}
                      />
                    </div>
                    {/* Client Age */}
                    <div>
                      <Input
                        type="number"
                        value={client.clientAge}
                        onChange={(e) => handleClientChange(index, 'clientAge', e.target.value)}
                        placeholder={t('bookings.clientAgePlaceholder') ?? 'Age'}
                        min={0}
                        max={120}
                        error={errors[`clients.${index}.clientAge`]}
                      />
                    </div>
                    {/* Nationality */}
                    <div>
                      <Select
                        options={[
                          {
                            value: '',
                            label: t('bookings.selectNationality') ?? 'Select nationality',
                          },
                          ...countries.map((country) => ({
                            value: country.code,
                            label:
                              language === 'en'
                                ? (country.nationality_en ?? country.name_en)
                                : (country.nationality_es ?? country.name_es),
                          })),
                        ]}
                        value={clientNationalities[index] ?? ''}
                        onChange={(value: string) => handleNationalityChange(index, value)}
                        placeholder={t('bookings.selectNationality') ?? 'Select nationality'}
                        id={`nationality-${index}`}
                      />
                      {errors[`clients.${index}.nationality`] !== undefined && (
                        <span
                          style={{
                            color: 'red',
                            fontSize: 'var(--text-xs)',
                            marginTop: 'var(--space-1)',
                            display: 'block',
                          }}
                        >
                          {errors[`clients.${index}.nationality`]}
                        </span>
                      )}
                    </div>
                    {/* ID Type - disabled until nationality is selected */}
                    <div>
                      <Select
                        options={[
                          { value: '', label: t('bookings.selectIdType') ?? 'Select ID Type' },
                          ...(allIdTypesByCountry[clientNationalities[index] ?? ''] ?? []).map(
                            (idType) => ({
                              value: idType.id,
                              label: language === 'en' ? idType.name_en : idType.name_es,
                            })
                          ),
                        ]}
                        value={client.identificationTypeId ?? ''}
                        onChange={(value: string) =>
                          handleClientChange(index, 'identificationTypeId', value)
                        }
                        placeholder={t('bookings.selectIdType') ?? 'Select ID Type'}
                        id={`id-type-${index}`}
                        disabled={(clientNationalities[index] ?? '') === ''}
                      />
                      {errors[`clients.${index}.identificationTypeId`] !== undefined && (
                        <span
                          style={{
                            color: 'red',
                            fontSize: 'var(--text-xs)',
                            marginTop: 'var(--space-1)',
                            display: 'block',
                          }}
                        >
                          {errors[`clients.${index}.identificationTypeId`]}
                        </span>
                      )}
                    </div>
                    {/* Client ID */}
                    <div>
                      <Input
                        type="text"
                        value={client.clientId ?? ''}
                        onChange={(e) => handleClientChange(index, 'clientId', e.target.value)}
                        placeholder={t('bookings.enterClientId') ?? 'Enter ID'}
                        error={errors[`clients.${index}.clientId`]}
                      />
                    </div>
                    {/* isPrimary radio */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="radio"
                        name="primaryClient"
                        checked={client.isPrimary === true}
                        onChange={() => handleSetPrimary(index)}
                        title={t('bookings.setPrimary') ?? 'Marcar como principal'}
                        style={{
                          width: 18,
                          height: 18,
                          cursor: 'pointer',
                          accentColor: 'var(--color-primary-500)',
                        }}
                      />
                    </div>
                    {/* Remove Button */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveClient(index)}
                        disabled={formData.clients.length <= 1}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor:
                            formData.clients.length <= 1
                              ? 'var(--color-neutral-100)'
                              : 'rgba(239, 68, 68, 0.08)',
                          color:
                            formData.clients.length <= 1 ? 'var(--color-neutral-400)' : '#dc2626',
                          border:
                            formData.clients.length <= 1
                              ? '1px solid var(--color-neutral-200)'
                              : '1px solid rgba(239, 68, 68, 0.25)',
                          cursor: formData.clients.length <= 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          if (formData.clients.length > 1) {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (formData.clients.length > 1) {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                          }
                        }}
                        title={t('common.remove') ?? 'Remove'}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {errors.clients !== undefined && (
                  <div
                    style={{
                      padding: 'var(--space-2)',
                      backgroundColor: 'var(--color-error-50)',
                      color: 'var(--color-error-700)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {errors.clients}
                  </div>
                )}
                {errors.primaryClient !== undefined && (
                  <div
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>⚠</span>
                    {errors.primaryClient}
                  </div>
                )}
                {errors['clients.minorWithoutAdult'] !== undefined && (
                  <div
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>⚠</span>
                    {errors['clients.minorWithoutAdult']}
                  </div>
                )}
              </div>
            </div>

            {/* Special Requests */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={hasSpecialRequests}
                  onChange={(e) => {
                    setHasSpecialRequests(e.target.checked);
                    if (!e.target.checked) {
                      setFormData((prev) => ({ ...prev, specialRequests: '' }));
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                {t('bookings.hasSpecialRequests') ?? 'Add special requests'}
              </label>
              {hasSpecialRequests && (
                <>
                  <textarea
                    value={formData.specialRequests ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))
                    }
                    placeholder={
                      t('bookings.specialRequestsPlaceholder') ??
                      'e.g. dietary restrictions, preferred language...'
                    }
                    rows={3}
                    style={{
                      marginTop: 'var(--space-2)',
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      border:
                        errors.specialRequests !== undefined
                          ? '1px solid #ef4444'
                          : '1px solid var(--color-neutral-300)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-neutral-900)',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.specialRequests !== undefined && (
                    <span
                      style={{
                        color: 'red',
                        fontSize: 'var(--text-xs)',
                        marginTop: 'var(--space-1)',
                        display: 'block',
                      }}
                    >
                      {errors.specialRequests}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* API Error Banner */}
            {apiError !== null && (
              <div
                ref={errorSummaryRef}
                style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      color: '#991b1b',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {language === 'en' ? 'Server Error' : 'Error del Servidor'}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: '#b91c1c',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {apiError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setApiError(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#b91c1c',
                    padding: 4,
                    flexShrink: 0,
                    lineHeight: 1,
                    fontSize: '18px',
                  }}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <div
                ref={errorSummaryRef}
                style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-error-50, #fef2f2)',
                  border: '1px solid var(--color-error-300, #fca5a5)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 var(--space-2) 0',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-error-700, #b91c1c)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  ⚠{' '}
                  {t('bookings.validationErrorsTitle') ??
                    'Por favor corrige los siguientes errores:'}
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 'var(--space-4)',
                    listStyleType: 'disc',
                  }}
                >
                  {Object.entries(errors).map(
                    ([key, message]) =>
                      message !== undefined && (
                        <li
                          key={key}
                          style={{
                            color: 'var(--color-error-700, #b91c1c)',
                            fontSize: 'var(--text-sm)',
                            marginBottom: 'var(--space-1)',
                          }}
                        >
                          {message}
                        </li>
                      )
                  )}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  if (onClose !== undefined) onClose();
                }}
                disabled={isSubmitting}
                className="modal-btn modal-btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={isSubmitting} className="modal-btn modal-btn-primary">
                {isSubmitting ? t('common.saving') : t('bookings.newBooking')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
