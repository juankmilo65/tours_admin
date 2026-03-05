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
import { selectAuthToken } from '~/store/slices/authSlice';
import { openModal, closeModal, setGlobalLoading } from '~/store/slices/uiSlice';
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
  const { showError } = useErrorModal();

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

    if (!formData.tourId) {
      newErrors.tourId = t('bookings.tours.tourRequired') ?? 'Tour is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = t('validation.required') ?? 'Required';
    }

    if (!formData.endDate) {
      newErrors.endDate = t('validation.required') ?? 'Required';
    }

    // Validate clients
    if (formData.clients.length === 0) {
      newErrors.clients = t('bookings.clientsRequired') ?? 'At least one client is required';
    } else {
      formData.clients.forEach((client, index) => {
        if (!client.clientName || client.clientName.trim() === '') {
          newErrors[`clients.${index}.clientName`] = t('validation.required') ?? 'Required';
        }
        if (!client.clientAge || client.clientAge < 0) {
          newErrors[`clients.${index}.clientAge`] = t('validation.required') ?? 'Required';
        }
        if ((clientNationalities[index] ?? '') === '') {
          newErrors[`clients.${index}.nationality`] =
            t('bookings.selectNationality') ?? 'Select nationality';
        }
        if ((client.identificationTypeId ?? '').trim() === '') {
          newErrors[`clients.${index}.identificationTypeId`] =
            t('bookings.selectIdType') ?? 'Select ID type';
        }
        if ((client.clientId ?? '').trim() === '') {
          newErrors[`clients.${index}.clientId`] = t('bookings.enterClientId') ?? 'Enter client ID';
        }
      });
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
        // Hide global spinner on error
        dispatch(setGlobalLoading({ isLoading: false }));

        const errorMessage =
          result.message ?? t('bookings.createError') ?? 'Error creating booking';

        const modalPayload = {
          id: 'create-booking-error',
          type: 'confirm',
          title: t('common.error'),
          isOpen: true,
          data: {
            message: errorMessage,
            icon: 'alert',
          },
        };

        // Close of create booking modal first so that error modal can appear on top
        if (onClose !== undefined) {
          onClose();
        }

        dispatch(openModal(modalPayload as Parameters<typeof openModal>[0]));
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
            message: t('bookings.createSuccess') ?? 'Booking created successfully',
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
                }}
                placeholder={t('bookings.selectCurrency') ?? 'Select currency'}
                id="select-currency"
              />
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
                      gridTemplateColumns: '40px 1fr 100px 180px 150px 150px 40px',
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
                    <div />
                  </div>
                </div>

                {formData.clients.map((client, index) => (
                  <div
                    key={`client-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 100px 180px 150px 150px 40px',
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
                    {/* ID Type - disabled until nationality is selected */}
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
                    {/* Client ID */}
                    <Input
                      type="text"
                      value={client.clientId ?? ''}
                      onChange={(e) => handleClientChange(index, 'clientId', e.target.value)}
                      placeholder={t('bookings.enterClientId') ?? 'Enter ID'}
                    />
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
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
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
                    border: '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-neutral-900)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
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
