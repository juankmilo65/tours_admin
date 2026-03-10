/**
 * Create Booking Modal Component
 * Follows same pattern as CreateTourModal with dynamic client list
 */

import React from 'react';
import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { createBookingBusiness } from '~/server/businessLogic/bookingsBusinessLogic';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectAuth } from '~/store/slices/authSlice';
import { openModal, setGlobalLoading } from '~/store/slices/uiSlice';
import { getToursDropdownBusiness } from '~/server/businessLogic/toursBusinessLogic';
import { getIdentificationTypesDropdownBusiness } from '~/server/businessLogic/identificationTypesBusinessLogic';
import { getCountriesDropdownBusiness } from '~/server/businessLogic/countriesBusinessLogic';
import { useErrorModal } from '~/utilities/useErrorModal';
import { Input } from '~/components/ui/Input';
import Select from '~/components/ui/Select';
import type { Client } from '~/types/booking';
import type { IdentificationTypeDropdown } from '~/types/identificationType';
import type { CountryDropdown } from '~/types/country';

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
  const { showError } = useErrorModal();

  const [isBookingForMe, setIsBookingForMe] = useState(false);

  const [tours, setTours] = useState<TourOption[]>([]);
  const [countries, setCountries] = useState<CountryDropdown[]>([]);
  const [identificationTypes, setIdentificationTypes] = useState<IdentificationTypeDropdown[]>([]);
  const [clientNationalities, setClientNationalities] = useState<Record<number, string>>({});

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

  // Fetch countries dropdown on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const resultRaw = await getCountriesDropdownBusiness(language);
        const result = resultRaw as { success?: boolean; data?: CountryDropdown[] };
        if (result.success === true && result.data !== undefined) {
          setCountries(result.data);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    void fetchCountries();
  }, [language]);

  // Fetch identification types by country code (dynamic, replaces hardcoded 'CO')
  const fetchIdentificationTypesByCountry = async (countryCode: string): Promise<void> => {
    dispatch(setGlobalLoading({ isLoading: true }));
    try {
      const identificationTypesData = await getIdentificationTypesDropdownBusiness(
        countryCode,
        true,
        language
      );
      const identificationTypesResult = identificationTypesData as {
        success?: boolean;
        data?: IdentificationTypeDropdown[];
      };

      if (
        identificationTypesResult.success === true &&
        identificationTypesResult.data !== undefined
      ) {
        setIdentificationTypes(identificationTypesResult.data);
      } else {
        setIdentificationTypes([]);
        showError({ messageKey: 'bookings.loadIdTypesError' });
      }
    } catch (error) {
      console.error('Error fetching identification types:', error);
      setIdentificationTypes([]);
    } finally {
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value, type } = e.target;

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

    // Reset identificationTypeId for this client when nationality changes
    handleClientChange(index, 'identificationTypeId', '');

    // Reload identification types for the selected country
    setIdentificationTypes([]);
    if (countryCode !== '') {
      void fetchIdentificationTypesByCountry(countryCode);
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

    // Validate primary client
    if (!formData.clients.some((c) => c.isPrimary === true)) {
      newErrors.primaryClient =
        t('bookings.noPrimaryClient') ?? 'Debes marcar un cliente como principal';
    }

    if (!formData.tourId) {
      newErrors.tourId = t('bookings.tours.tourRequired') ?? 'Tour is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = t('validation.required') ?? 'Required';
    }

    if (!formData.endDate) {
      newErrors.endDate = t('validation.required') ?? 'Required';
    }

    // Validate dates: end date must be after start date
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate =
          t('bookings.endDateAfterStartDate') ??
          'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    // Validate currency
    if (!formData.currency || formData.currency.trim() === '') {
      newErrors.currency = t('validation.required') ?? 'Required';
    }

    // Validate clients
    if (formData.clients.length === 0) {
      newErrors.clients = t('bookings.clientsRequired') ?? 'At least one client is required';
    } else {
      formData.clients.forEach((client, index) => {
        // Client Name validation
        if (!client.clientName || client.clientName.trim() === '') {
          newErrors[`clients.${index}.clientName`] = t('validation.required') ?? 'Required';
        } else if (client.clientName.trim().length < 3) {
          newErrors[`clients.${index}.clientName`] =
            t('bookings.clientNameMinLength') ?? 'El nombre debe tener al menos 3 caracteres';
        } else if (client.clientName.trim().length > 100) {
          newErrors[`clients.${index}.clientName`] =
            t('bookings.clientNameMaxLength') ?? 'El nombre no puede exceder 100 caracteres';
        }

        // Client Age validation
        if (client.clientAge === undefined || client.clientAge === null) {
          newErrors[`clients.${index}.clientAge`] = t('validation.required') ?? 'Required';
        } else if (!Number.isInteger(client.clientAge)) {
          newErrors[`clients.${index}.clientAge`] =
            t('bookings.clientAgeInteger') ?? 'La edad debe ser un número entero';
        } else if (client.clientAge < 0) {
          newErrors[`clients.${index}.clientAge`] =
            t('bookings.clientAgeMin') ?? 'La edad no puede ser negativa';
        } else if (client.clientAge > 120) {
          newErrors[`clients.${index}.clientAge`] =
            t('bookings.clientAgeMax') ?? 'La edad no puede ser mayor a 120 años';
        } else if (client.clientAge < 18) {
          newErrors[`clients.${index}.clientAge`] =
            t('bookings.clientAgeUnder18') ??
            'Los menores de 18 años deben ser acompañados por un adulto';
        }

        // Nationality validation
        if ((clientNationalities[index] ?? '') === '') {
          newErrors[`clients.${index}.nationality`] =
            t('bookings.selectNationality') ?? 'Select nationality';
        }

        // ID Type validation (only if nationality is selected)
        if (
          (clientNationalities[index] ?? '') !== '' &&
          (client.identificationTypeId ?? '').trim() === ''
        ) {
          newErrors[`clients.${index}.identificationTypeId`] =
            t('bookings.selectIdType') ?? 'Select ID type';
        }

        // Client ID validation (only if ID type is selected)
        if (
          (client.identificationTypeId ?? '').trim() !== '' &&
          (client.clientId ?? '').trim() === ''
        ) {
          newErrors[`clients.${index}.clientId`] = t('bookings.enterClientId') ?? 'Enter client ID';
        } else if (
          (client.clientId ?? '').trim() !== '' &&
          (client.clientId ?? '').trim().length < 3
        ) {
          newErrors[`clients.${index}.clientId`] =
            t('bookings.clientIdMinLength') ?? 'El ID debe tener al menos 3 caracteres';
        } else if ((client.clientId ?? '').trim().length > 50) {
          newErrors[`clients.${index}.clientId`] =
            t('bookings.clientIdMaxLength') ?? 'El ID no puede exceder 50 caracteres';
        }
      });
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
      // Merge countryCode from clientNationalities into each client before submitting
      const payloadWithCountry: BookingFormData = {
        ...formData,
        clients: formData.clients.map((client, index) => ({
          ...client,
          countryCode: clientNationalities[index] ?? '',
        })),
        specialRequests: hasSpecialRequests ? (formData.specialRequests ?? '') : undefined,
      };

      const result = await createBookingBusiness(payloadWithCountry, token ?? '');
      if (!result.success) {
        // Hide global spinner on error, keep modal open
        dispatch(setGlobalLoading({ isLoading: false }));

        const errorMessage =
          result.message ?? t('bookings.createError') ?? 'Error creating booking';

        dispatch(
          openModal({
            id: 'create-booking-error',
            type: 'confirm',
            title: t('common.error') ?? 'Error',
            isOpen: true,
            data: { message: errorMessage, icon: 'alert' },
          } as Parameters<typeof openModal>[0])
        );
        setIsSubmitting(false);
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
      // Hide global spinner on error
      dispatch(setGlobalLoading({ isLoading: false }));
      dispatch(
        openModal({
          id: 'create-booking-error',
          type: 'confirm',
          title: t('common.error'),
          isOpen: true,
          data: {
            message: t('bookings.createError') ?? 'Error creating booking',
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
                  type="datetime-local"
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
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  error={errors.endDate}
                />
              </div>
            </div>

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
                <button
                  type="button"
                  onClick={handleAddClient}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'var(--color-primary-500)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 'var(--font-weight-medium)',
                    fontSize: 'var(--text-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
                  }}
                >
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
                        required
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
                        required
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
                          ...identificationTypes.map((idType) => ({
                            value: idType.id,
                            label: language === 'en' ? idType.name_en : idType.name_es,
                          })),
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
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor:
                            formData.clients.length <= 1
                              ? 'var(--color-neutral-200)'
                              : 'rgba(239, 68, 68, 0.1)',
                          color:
                            formData.clients.length <= 1
                              ? 'var(--color-neutral-400)'
                              : 'var(--color-error-600)',
                          border: 'none',
                          cursor: formData.clients.length <= 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          if (formData.clients.length > 1) {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (formData.clients.length > 1) {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                          }
                        }}
                        title={t('common.remove') ?? 'Remove'}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
