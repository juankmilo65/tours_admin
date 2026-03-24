/**
 * Create Booking Modal Component
 * Follows same pattern as CreateTourModal with dynamic client list
 */

import React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEn, bookingEs } from '~/lib/i18n';
import { createBookingBusiness } from '~/server/businessLogic/bookingsBusinessLogic';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectAuth } from '~/store/slices/authSlice';
import { openModal, setGlobalLoading } from '~/store/slices/uiSlice';
import { selectSelectedCurrencyCode, selectSelectedCountry } from '~/store/slices/countriesSlice';
import {
  getToursDropdownBusiness,
  getTourHourRangeBusiness,
  getTourByIdBusiness,
} from '~/server/businessLogic/toursBusinessLogic';
import { getUsersDropdownBusiness } from '~/server/businessLogic/usersBusinessLogic';
import { useDropdownCache } from '~/hooks/useDropdownCache';
import { Input } from '~/components/ui/Input';
import Select from '~/components/ui/Select';
import type { Client } from '~/types/booking';
import { ClientFormModal } from '~/components/bookings/ClientFormModal';
import type { ClientFormData } from '~/components/bookings/ClientFormModal';
import {
  getMinimumBookingDate,
  getTimezoneForCountry,
  buildDateTimeInTimezone,
} from '~/utilities/timezoneValidation';
import { getTourAvailabilityBusiness } from '~/server/businessLogic/tourAvailabilityBusinessLogic';
import { TourAvailabilityDisplay } from '~/components/bookings/TourAvailabilityDisplay';
import type { TourAvailabilityData } from '~/types/tourAvailability';
import type { BookingTourActivity } from '~/types/booking';

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
  const bookingsT = language === 'en' ? bookingEn : bookingEs;
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectAuth).user;
  const selectedCountryCurrency = useAppSelector(selectSelectedCurrencyCode);
  const selectedCountry = useAppSelector(selectSelectedCountry);

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
  const [tourBasePrice, setTourBasePrice] = useState<number | null>(null);
  const [tourMinimumPayment, setTourMinimumPayment] = useState<number | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [tourActivities, setTourActivities] = useState<BookingTourActivity[]>([]);

  // Cache-first dropdown loaders
  const { loadNationalities } = useDropdownCache();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClientIndex, setEditingClientIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<BookingFormData>({
    tourId: '',
    startDate: '',
    endDate: '',
    currency: 'MXN',
    clients: [],
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSpecialRequests, setHasSpecialRequests] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Reset all form state when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const initialCurrency = selectedCountryCurrency;
    setFormData({
      tourId: '',
      startDate: '',
      endDate: '',
      currency: initialCurrency,
      clients: [],
    });
    setErrors({});
    setIsSubmitting(false);
    setHasSpecialRequests(false);
    setApiError(null);
    setIsBookingForMe(false);
    setClientNationalities({});
    setHourRange(null);
    setTourDaysCount(null);
    setMinBookingDate('');
    setTourCountryCode('');
    setTourAvailability(null);
    setAvailabilityError('');
    setTourBasePrice(null);
    setTourActivities([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  // Fetch users with role 'user' when modal opens (only for admin)
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      if (currentUser?.role === 'admin' && token !== null && token !== '') {
        try {
          const usersResult = await getUsersDropdownBusiness(['user'], 'true', token, language);
          if (usersResult.success === true && usersResult.data !== undefined) {
            setUsers(
              usersResult.data.map((u) => ({
                id: u.id,
                name: u.firstName,
                email: u.email,
              }))
            );
          }
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      }
    };

    void fetchUsers();
  }, [isOpen, currentUser?.role, token, language]);

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
      setTourActivities([]);
      return;
    }
    const fetchTourDetails = async () => {
      setIsLoadingHourRange(true);
      try {
        console.warn('🔄 Fetching tour details for:', formData.tourId);
        console.warn('🔑 Token available:', token !== null && token !== '');

        // Fetch hour range
        const hourRangeResult = await getTourHourRangeBusiness(formData.tourId, token, language);

        console.warn('📦 Hour Range Result:', JSON.stringify(hourRangeResult, null, 2));

        // ✅ Validate response structure
        if (!hourRangeResult?.success || !hourRangeResult.data) {
          console.warn('Failed to fetch hour range:', hourRangeResult?.message);
          setHourRange(null);
          setTourDaysCount(null);
          setTourBasePrice(null);
          setTourMinimumPayment(null);
        } else {
          // ✅ Use optional chaining and nullish coalescing
          const data = hourRangeResult.data;

          console.warn('✅ Setting hour range data:', {
            hourRange: data.hourRange,
            daysCount: data.daysCount,
            basePrice: data.basePrice,
            minimumPayment: data.minimumPayment,
          });

          setHourRange(data.hourRange ?? null);
          setTourDaysCount(data.daysCount ?? null);
          setTourBasePrice(data.basePrice !== undefined ? Number(data.basePrice) : null);
          setTourMinimumPayment(
            data.minimumPayment !== undefined ? Number(data.minimumPayment) : null
          );
        }

        // Fetch tour details to get country code and activities
        const tourResult = (await getTourByIdBusiness(formData.tourId, language, 'MXN', token)) as {
          success?: boolean;
          data?: {
            city?: { countryId?: string };
            days?: Array<{
              day: number;
              activities: BookingTourActivity[];
            }>;
          };
        };
        console.warn('🔍 Tour Result Full:', JSON.stringify(tourResult, null, 2));
        console.warn('🔍 tourResult.success:', tourResult.success);
        console.warn('🔍 tourResult.data:', tourResult.data);
        console.warn('🔍 tourResult.data?.days:', tourResult.data?.days);

        // ✅ Validate tour result
        if (tourResult.success === true && tourResult.data !== undefined) {
          const countryCode = tourResult.data.city?.countryId ?? '';
          setTourCountryCode(countryCode);

          // Extract activities from days array
          const days = tourResult.data.days ?? [];
          const allActivities: BookingTourActivity[] = [];

          days.forEach((dayItem) => {
            const dayActivities = dayItem.activities ?? [];
            allActivities.push(...dayActivities);
          });

          console.warn(
            '✅ Setting activities from days:',
            allActivities.length,
            'activities:',
            allActivities
          );
          setTourActivities(allActivities);

          // Calculate minimum booking date if we have tour start time
          const currentHourRange =
            hourRangeResult.success &&
            hourRangeResult.data?.hourRange !== null &&
            hourRangeResult.data?.hourRange !== undefined &&
            hourRangeResult.data.hourRange !== ''
              ? hourRangeResult.data.hourRange
              : null;

          if (currentHourRange !== null) {
            const startTime = currentHourRange.split(' - ')[0] ?? '';
            const minDate = getMinimumBookingDate(startTime, countryCode);
            setMinBookingDate(minDate);
          } else {
            setMinBookingDate('');
          }
        } else {
          setTourCountryCode('');
          setMinBookingDate('');
          setTourActivities([]);
        }
      } catch (error) {
        console.error('💥 Error fetching tour details:', error);
        console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('💥 Error message:', error instanceof Error ? error.message : String(error));

        setHourRange(null);
        setMinBookingDate('');
        setTourCountryCode('');
        setTourDaysCount(null);
        setTourBasePrice(null);
        setTourMinimumPayment(null);
        setTourActivities([]);
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
  // ── Modal-based client handlers ──

  const handleOpenAddClient = (): void => {
    setEditingClientIndex(null);
    setClientModalOpen(true);
  };

  const handleOpenEditClient = (index: number): void => {
    setEditingClientIndex(index);
    setClientModalOpen(true);
  };

  const handleClientModalSave = (data: ClientFormData): void => {
    // Si es el primer cliente, forzar isPrimary a true
    const isFirstClient = formData.clients.length === 0 && editingClientIndex === null;
    const client: Client = {
      clientName: data.clientName,
      clientAge: Number(data.clientAge),
      email: data.clientEmail,
      countryCode: data.countryCode,
      identificationTypeId: data.identificationTypeId,
      clientId: data.clientId,
      userId: data.userId ?? null,
      isPrimary: isFirstClient ? true : (data.isPrimary ?? false),
    };

    if (editingClientIndex !== null) {
      // Editing existing client
      const newClients = [...formData.clients];
      newClients[editingClientIndex] = client;
      // If this client was marked primary, unmark all others
      if (client.isPrimary === true) {
        newClients.forEach((c, i) => {
          if (i !== editingClientIndex) c.isPrimary = false;
        });
        // If a different client than index 0 is primary, un-tick "for me"
        if (editingClientIndex !== 0) setIsBookingForMe(false);
      }
      setFormData((prev) => ({ ...prev, clients: newClients }));
      // Update nationality map
      setClientNationalities((prev) => ({ ...prev, [editingClientIndex]: data.countryCode }));
    } else {
      // Adding new client
      const newClients = [...formData.clients];
      if (client.isPrimary === true) {
        newClients.forEach((c) => {
          c.isPrimary = false;
        });
        setIsBookingForMe(false);
      }
      newClients.push(client);
      setFormData((prev) => ({ ...prev, clients: newClients }));
      // Update nationality map
      setClientNationalities((prev) => ({ ...prev, [newClients.length - 1]: data.countryCode }));
    }

    // Clear related errors
    setErrors((prev) => {
      const next = { ...prev };
      delete next.clients;
      delete next.primaryClient;
      delete next['clients.minorWithoutAdult'];
      return next;
    });

    setClientModalOpen(false);
  };

  // Price calculation
  const priceSummary = useMemo(() => {
    const basePrice = tourBasePrice ?? 0;
    const filled = formData.clients.filter((c) => c.clientName.trim() !== '');
    const minors = filled.filter((c) => c.clientAge > 0 && c.clientAge < 18).length;
    const validClients = filled.length;
    const subtotal = basePrice * validClients;
    const minorDiscount = basePrice * minors * 0.1;
    const total = subtotal - minorDiscount;
    return { basePrice, validClients, minors, subtotal, minorDiscount, total };
  }, [tourBasePrice, formData.clients]);

  // Determine when each section should be enabled
  const canEnableDates = useMemo(() => {
    return formData.tourId !== '' && !isLoadingHourRange;
  }, [formData.tourId, isLoadingHourRange]);

  const canAddClients = useMemo(() => {
    // Clients can be added after dates are selected and availability is checked
    const datesSet = formData.startDate !== '' && formData.endDate !== '';
    const hasAvailability = tourAvailability !== null && (tourAvailability.availableSlots ?? 0) > 0;
    return datesSet && hasAvailability && !isLoadingAvailability;
  }, [formData.startDate, formData.endDate, tourAvailability, isLoadingAvailability]);

  const canAddSpecialRequests = useMemo(() => {
    return formData.clients.length > 0;
  }, [formData.clients.length]);

  const canSubmit = useMemo(() => {
    // All components must have data
    const hasTour = formData.tourId !== '';
    const hasDates = formData.startDate !== '' && formData.endDate !== '';
    const hasCurrency = formData.currency !== '';
    const hasClients = formData.clients.length > 0;
    const hasAvailability = tourAvailability !== null && (tourAvailability.availableSlots ?? 0) > 0;

    return hasTour && hasDates && hasCurrency && hasClients && hasAvailability && !isSubmitting;
  }, [
    formData.tourId,
    formData.startDate,
    formData.endDate,
    formData.currency,
    formData.clients.length,
    tourAvailability,
    isSubmitting,
  ]);

  // 🛡️ Don't render if modal is not open (after all hooks for React rules)
  if (!isOpen) {
    return null;
  }

  const formatCurrency = (amount: number, currency: string): string => {
    try {
      return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-MX', {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const getClientModalInitialData = (): ClientFormData | undefined => {
    if (editingClientIndex === null) return undefined;
    const c = formData.clients[editingClientIndex];
    if (c === undefined) return undefined;
    return {
      clientName: c.clientName,
      clientAge: c.clientAge,
      clientEmail: c.email ?? '',
      countryCode: clientNationalities[editingClientIndex] ?? c.countryCode ?? '',
      identificationTypeId: c.identificationTypeId ?? '',
      clientId: c.clientId ?? '',
      userId: c.userId ?? null,
      isPrimary: c.isPrimary ?? false,
    };
  };

  // Remove a client
  const handleRemoveClient = (index: number): void => {
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

      const payloadWithCountry = {
        ...formData,
        startDate: buildDateTime(formData.startDate, rangeStart ?? '00:00'),
        endDate: buildDateTime(formData.endDate, rangeEnd ?? '00:00'),
        clients: formData.clients.map((client, index) => ({
          ...client,
          countryCode: clientNationalities[index] ?? '',
        })),
        specialRequests: hasSpecialRequests ? (formData.specialRequests ?? '') : undefined,
        totalPrice: priceSummary.total,
        minimumPayment: tourMinimumPayment ?? undefined,
        countryCode: selectedCountry?.code ?? 'MX', // País seleccionado del header
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
            message: (() => {
              const code = result.data?.confirmationCode;
              if (code !== undefined && code !== null && code !== '') {
                return language === 'en'
                  ? `Booking created successfully!\nConfirmation code: ${code}`
                  : `¡Reserva creada exitosamente!\nCódigo de confirmación: ${code}`;
              }
              return (
                result.message ?? t('bookings.createSuccess') ?? 'Booking created successfully'
              );
            })(),
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

            {/* Tour Activities / Itinerary */}
            {(() => {
              console.warn('🎨 tourActivities.length:', tourActivities.length);
              if (tourActivities.length === 0) return null;

              // Group by day
              const dayMap = new Map<number, BookingTourActivity[]>();
              tourActivities.forEach((act) => {
                const d = act.day ?? 1;
                if (!dayMap.has(d)) dayMap.set(d, []);
                const group = dayMap.get(d);
                if (group) group.push(act);
              });
              const sortedDays = [...dayMap.entries()].sort(([a], [b]) => a - b);
              sortedDays.forEach(([, acts]) => acts.sort((a, b) => a.sortOrder - b.sortOrder));

              return (
                <div>
                  <h3
                    style={{
                      margin: '0 0 var(--space-3) 0',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    {language === 'en' ? 'Tour Itinerary' : 'Itinerario del Tour'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sortedDays.map(([dayNum, acts]) => (
                      <div
                        key={`day-${dayNum}`}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: 'var(--radius-lg, 10px)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 14px',
                            background: '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#dbeafe',
                              color: '#1d4ed8',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {dayNum}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                            {language === 'en' ? 'Day' : 'Día'} {dayNum}
                          </span>
                        </div>
                        <div>
                          {acts.map((act, idx) => (
                            <div
                              key={act.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                borderBottom: idx < acts.length - 1 ? '1px solid #f3f4f6' : 'none',
                                background: idx % 2 === 0 ? 'white' : '#fafbfc',
                              }}
                            >
                              <div
                                style={{
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: 9999,
                                  background: '#f0f9ff',
                                  border: '1px solid #bae6fd',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: '#0369a1',
                                  minWidth: 60,
                                  justifyContent: 'center',
                                }}
                              >
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                                {act.hora}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: '#374151',
                                  fontWeight: 500,
                                }}
                              >
                                {language === 'en' ? act.activity_en : act.activity_es}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
                      disabled={!canEnableDates}
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
                      disabled={!canEnableDates || (tourDaysCount !== null && tourDaysCount > 0)}
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
                  { value: 'COP', label: 'COP - Colombian Peso' },
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'PEN', label: 'PEN - Peruvian Sol' },
                  { value: 'CLP', label: 'CLP - Chilean Peso' },
                  { value: 'ARS', label: 'ARS - Argentine Peso' },
                  { value: 'BRL', label: 'BRL - Brazilian Real' },
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
                disabled={true}
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
            {/* Is this booking for me? - Only show for user role */}
            {currentUser !== null && currentUser.role === 'user' && (
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
            )}

            {/* Clients */}
            <div style={{ marginTop: 'var(--space-2)' }}>
              {formData.clients.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-3)',
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
                    onClick={handleOpenAddClient}
                    className="modal-btn-add-client"
                    disabled={!canAddClients}
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
              )}

              {formData.clients.length === 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 'var(--space-4)',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleOpenAddClient}
                    className="modal-btn-add-client"
                    disabled={!canAddClients}
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
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {formData.clients.map((client, index) => (
                  <div
                    key={`client-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 'var(--radius-md, 8px)',
                      background: index % 2 === 0 ? 'white' : '#f9fafb',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: client.isPrimary === true ? '#dbeafe' : '#f3f4f6',
                          color: client.isPrimary === true ? '#1d4ed8' : '#6b7280',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                            {client.clientName || (language === 'en' ? 'Unnamed' : 'Sin nombre')}
                          </span>
                          {client.isPrimary === true && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                padding: '1px 8px',
                                borderRadius: 9999,
                                background: '#dbeafe',
                                color: '#1d4ed8',
                              }}
                            >
                              {bookingsT.primaryLabel}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {client.clientAge} {bookingsT.yearsOld}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditClient(index)}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 'var(--radius-md, 6px)',
                          border: '1px solid var(--color-primary-200, #bfdbfe)',
                          cursor: 'pointer',
                          background: 'var(--color-primary-50, #eff6ff)',
                          color: 'var(--color-primary-600, #2563eb)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'var(--color-primary-100, #dbeafe)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'var(--color-primary-50, #eff6ff)';
                        }}
                        title={
                          t('bookings.editClient') ??
                          (language === 'en' ? 'Edit Client' : 'Editar Cliente')
                        }
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      {/* Delete button — only for non-primary clients */}
                      {client.isPrimary !== true && (
                        <button
                          type="button"
                          onClick={() => handleRemoveClient(index)}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 'var(--radius-md, 6px)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            cursor: 'pointer',
                            background: 'rgba(239,68,68,0.08)',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)';
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
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
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {formData.clients.length === 0 && (
                  <div
                    style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '0.875rem',
                      border: '1px dashed #e5e7eb',
                      borderRadius: 'var(--radius-md, 8px)',
                    }}
                  >
                    {language === 'en' ? 'No clients added yet' : 'No hay clientes agregados'}
                  </div>
                )}

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

            {/* Price Summary */}
            {tourBasePrice !== null && priceSummary.validClients > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-md, 8px)',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#166534',
                  }}
                >
                  {bookingsT.priceSummary}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      color: '#374151',
                    }}
                  >
                    <span>
                      {bookingsT.basePricePerPerson}:{' '}
                      <strong>{formatCurrency(priceSummary.basePrice, formData.currency)}</strong> ×{' '}
                      {priceSummary.validClients}
                    </span>
                    <span>{formatCurrency(priceSummary.subtotal, formData.currency)}</span>
                  </div>
                  {priceSummary.minorDiscount > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8125rem',
                        color: '#dc2626',
                      }}
                    >
                      <span>
                        {bookingsT.minorDiscount} ({priceSummary.minors})
                      </span>
                      <span>-{formatCurrency(priceSummary.minorDiscount, formData.currency)}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: '#166534',
                      borderTop: '1px solid #bbf7d0',
                      paddingTop: 8,
                      marginTop: 4,
                    }}
                  >
                    <span>{bookingsT.totalPrice}</span>
                    <span>{formatCurrency(priceSummary.total, formData.currency)}</span>
                  </div>
                  {tourMinimumPayment !== null && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        color: '#0e7490',
                        borderTop: '1px dashed #bbf7d0',
                        paddingTop: 8,
                        marginTop: 4,
                      }}
                    >
                      <span>{bookingsT.minimumPayment ?? 'Pago mínimo'}</span>
                      <span>{formatCurrency(tourMinimumPayment, formData.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Client Form Modal */}
            <ClientFormModal
              isOpen={clientModalOpen}
              language={language}
              initialData={getClientModalInitialData()}
              showPrimary={true}
              isFirstClient={editingClientIndex === null && formData.clients.length === 0}
              users={users}
              onSave={handleClientModalSave}
              onClose={() => setClientModalOpen(false)}
              translations={{
                clientName: t('bookings.clientName') ?? 'Client Name',
                clientAge: t('bookings.clientAge') ?? 'Age',
                clientNamePlaceholder: t('bookings.clientNamePlaceholder') ?? 'Enter name',
                clientAgePlaceholder: t('bookings.clientAgePlaceholder') ?? 'Age',
                selectNationality: t('bookings.selectNationality') ?? 'Select nationality',
                selectIdType: t('bookings.selectIdType') ?? 'Select ID Type',
                enterClientId: t('bookings.enterClientId') ?? 'Enter ID',
                isPrimary: t('bookings.isPrimary') ?? 'Principal',
                clientNameMinLength:
                  t('bookings.clientNameMinLength') ?? 'El nombre debe tener al menos 3 caracteres',
                clientNameMaxLength:
                  t('bookings.clientNameMaxLength') ?? 'El nombre no puede exceder 100 caracteres',
                clientAgeMin: t('bookings.clientAgeMin') ?? 'La edad no puede ser negativa',
                clientAgeMax: t('bookings.clientAgeMax') ?? 'La edad no puede ser mayor a 120 años',
                select: bookingsT.select,
                selectUser: bookingsT.selectUser,
                clientIdLabel: bookingsT.clientIdLabel,
                enterEmail: bookingsT.enterEmail,
                emailLabel: bookingsT.emailLabel,
                nationalityLabel: bookingsT.nationalityLabel,
                idTypeLabel: bookingsT.idTypeLabel,
                editClient: bookingsT.editClient,
                addClient: bookingsT.addClient,
                cancel: bookingsT.cancel,
                save: bookingsT.save,
                add: bookingsT.add,
              }}
            />

            {/* Special Requests */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  cursor: canAddSpecialRequests ? 'pointer' : 'not-allowed',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: canAddSpecialRequests
                    ? 'var(--color-neutral-700)'
                    : 'var(--color-neutral-400)',
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
                  disabled={!canAddSpecialRequests}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: canAddSpecialRequests ? 'pointer' : 'not-allowed',
                  }}
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
            {Object.values(errors).some((v) => v !== undefined) && (
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
              <button type="submit" disabled={!canSubmit} className="modal-btn modal-btn-primary">
                {isSubmitting ? t('common.saving') : t('bookings.newBooking')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
