/**
 * EditBookingModal
 * Allows editing startDate, endDate, clients and specialRequests.
 * All other fields are shown read-only / disabled.
 */

import type { JSX, CSSProperties, FormEvent } from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';
import { Input } from '~/components/ui/Input';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { openModal, setGlobalLoading } from '~/store/slices/uiSlice';
import { selectAuthToken } from '~/store/slices/authSlice';
import { updateBookingBusiness } from '~/server/businessLogic/bookingsBusinessLogic';
import { getTimezoneForCountry, buildDateTimeInTimezone } from '~/utilities/timezoneValidation';
import { useDropdownCache } from '~/hooks/useDropdownCache';
import type { Booking, BookingClient, BookingTourActivity } from '~/types/booking';
import { ClientFormModal } from '~/components/bookings/ClientFormModal';
import type { ClientFormData } from '~/components/bookings/ClientFormModal';
import { isWithinRestrictionWindow } from '~/utilities/validationHelpers';

interface EditBookingModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSuccess: () => void;
  readOnly?: boolean;
}

interface EditFormData {
  startDate: string;
  endDate: string;
  specialRequests: string;
  clients: BookingClient[];
}

interface BookingDetailItineraryDay {
  day: number;
  activities: Array<
    BookingTourActivity & {
      tourId?: string;
      tourOrder?: number;
      tourTitle?: string;
      tourName?: string;
      tourNameEs?: string;
      tourNameEn?: string;
    }
  >;
}

interface BookingDetailTour {
  id: string;
  order?: number;
  title?: string;
  title_es?: string;
  title_en?: string;
  priceForThisTour?: string | number;
  basePrice?: string | number;
  activities?: BookingTourActivity[];
}

interface BookingDetailsShape {
  itineraryByDay?: BookingDetailItineraryDay[];
  tours?: BookingDetailTour[];
}

// Convert ISO to date-only value (YYYY-MM-DD in local time)
function toDateLocal(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return '';
  }
}

export function EditBookingModal({
  isOpen,
  booking,
  onClose,
  onSuccess,
  readOnly = false,
}: EditBookingModalProps): JSX.Element | null {
  const { t, language } = useTranslation();
  const bookingsT = language === 'en' ? bookingEn : bookingEs;
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);

  const [formData, setFormData] = useState<EditFormData>({
    startDate: '',
    endDate: '',
    specialRequests: '',
    clients: [],
  });
  const [hasSpecialRequests, setHasSpecialRequests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [hourRange, setHourRange] = useState<string | null>(null);
  const [tourDaysCount, setTourDaysCount] = useState<number | null>(null);
  const [tourCountryCode, setTourCountryCode] = useState<string>('');

  const [clientNationalities, setClientNationalities] = useState<Record<number, string>>({});

  const clearErrors = (...keys: string[]): void => {
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  };

  // Cache-first dropdown loaders
  const { loadNationalities, loadIdentificationTypes } = useDropdownCache();

  // Client modal state
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClientIndex, setEditingClientIndex] = useState<number | null>(null);
  const bookingDetails = booking as BookingDetailsShape | null;

  // Populate form when booking changes
  useEffect(() => {
    const currentBooking = booking;
    if (!currentBooking) return;

    const clients: BookingClient[] = (currentBooking.clients ?? []).map((c) => ({ ...c }));
    if (clients.length === 0) {
      clients.push({ clientName: '', clientAge: 0 });
    }

    setFormData({
      startDate: toDateLocal(currentBooking.startDate),
      endDate: toDateLocal(currentBooking.endDate),
      specialRequests: currentBooking.specialRequests ?? '',
      clients,
    });
    setHasSpecialRequests((currentBooking.specialRequests ?? '') !== '');
    setErrors({});
    setApiError(null);
  }, [booking]);

  // On modal open: load nationality dropdown + init per-client nationalities + preload ID types + set tour data
  useEffect(() => {
    const currentBooking = booking;
    if (!isOpen || !currentBooking) return;

    void loadNationalities(language);

    if (currentBooking.clients) {
      // Initialise clientNationalities from the existing booking data
      const initNat: Record<number, string> = {};
      currentBooking.clients.forEach((c, i) => {
        if (c.countryCode !== undefined && c.countryCode !== '') initNat[i] = c.countryCode;
      });
      setClientNationalities(initNat);

      // Preload identification types for every unique country in the booking
      const uniqueCodes = [
        ...new Set(currentBooking.clients.map((c) => c.countryCode).filter(Boolean)),
      ];
      uniqueCodes.forEach((code) => {
        if (code !== undefined && code !== '') void loadIdentificationTypes(code, language);
      });
    }

    // Use booking response data directly (new and legacy shapes)
    if (currentBooking.tour) {
      const startTimeFormatted = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(currentBooking.startDate));
      const endTimeFormatted = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(currentBooking.endDate));

      setHourRange(currentBooking.tour.hourRange ?? `${startTimeFormatted} - ${endTimeFormatted}`);
      setTourDaysCount(
        bookingDetails?.itineraryByDay?.length ?? currentBooking.tour.daysCount ?? null
      );
      setTourCountryCode(currentBooking.countryCode ?? currentBooking.tour.city?.countryId ?? '');
    } else {
      const startTimeFormatted = currentBooking.startDate
        ? new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }).format(new Date(currentBooking.startDate))
        : '';
      const endTimeFormatted = currentBooking.endDate
        ? new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }).format(new Date(currentBooking.endDate))
        : '';

      setHourRange(
        startTimeFormatted !== '' && endTimeFormatted !== ''
          ? `${startTimeFormatted} - ${endTimeFormatted}`
          : null
      );
      setTourDaysCount(bookingDetails?.itineraryByDay?.length ?? null);
      setTourCountryCode(currentBooking.countryCode ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking]);

  const handleOpenAddClient = (): void => {
    setEditingClientIndex(null);
    setClientModalOpen(true);
  };

  const handleOpenEditClient = (index: number): void => {
    setEditingClientIndex(index);
    setClientModalOpen(true);
  };

  const handleClientModalSave = (data: ClientFormData): void => {
    if (apiError !== null) setApiError(null);
    const updatedClient: BookingClient = {
      ...(editingClientIndex !== null ? formData.clients[editingClientIndex] : {}),
      clientName: data.clientName,
      clientAge: data.clientAge,
      countryCode: data.countryCode,
      identificationTypeId: data.identificationTypeId,
      clientId: data.clientId,
      email: data.clientEmail,
      userId: data.userId ?? null,
      isPrimary: data.isPrimary ?? false,
    };

    if (editingClientIndex !== null) {
      // Update existing client
      setFormData((p) => {
        const newClients = p.clients.map((c, i) => (i === editingClientIndex ? updatedClient : c));
        // If this client was marked primary, unmark all others
        if (updatedClient.isPrimary === true) {
          return {
            ...p,
            clients: newClients.map((c, i) =>
              i === editingClientIndex ? c : { ...c, isPrimary: false }
            ),
          };
        }
        return { ...p, clients: newClients };
      });
      setClientNationalities((p) => ({ ...p, [editingClientIndex]: data.countryCode }));
    } else {
      // Add new client
      const newIndex = formData.clients.length;
      setFormData((p) => {
        // If new client is marked primary, unmark all existing clients
        if (updatedClient.isPrimary === true) {
          return {
            ...p,
            clients: [...p.clients.map((c) => ({ ...c, isPrimary: false })), updatedClient],
          };
        }
        return { ...p, clients: [...p.clients, updatedClient] };
      });
      setClientNationalities((p) => ({ ...p, [newIndex]: data.countryCode }));
    }

    // Clear related errors
    const idx = editingClientIndex ?? formData.clients.length;
    clearErrors(
      `clients.${idx}.clientName`,
      `clients.${idx}.clientAge`,
      `clients.${idx}.nationality`,
      `clients.${idx}.identificationTypeId`,
      'clients.minorWithoutAdult'
    );

    setClientModalOpen(false);
  };

  const handleRemoveClient = (index: number): void => {
    setFormData((p) => ({ ...p, clients: p.clients.filter((_, i) => i !== index) }));
    setClientNationalities((p) => {
      const updated: Record<number, string> = {};
      Object.entries(p).forEach(([k, v]) => {
        const n = Number(k);
        if (n < index) updated[n] = v;
        else if (n > index) updated[n - 1] = v;
      });
      return updated;
    });
  };

  // Price calculation
  const priceSummary = useMemo(() => {
    const rawBase = booking?.tour?.basePrice;
    const basePrice = typeof rawBase === 'string' ? parseFloat(rawBase) : (rawBase ?? 0);
    const filled = formData.clients.filter((c) => c.clientName.trim() !== '');
    const minors = filled.filter((c) => c.clientAge > 0 && c.clientAge < 18).length;
    const validClients = filled.length;
    const subtotal = basePrice * validClients;
    const minorDiscount = basePrice * minors * 0.1;
    const total = subtotal - minorDiscount;
    return { basePrice, validClients, minors, subtotal, minorDiscount, total };
  }, [booking?.tour?.basePrice, formData.clients]);

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

  const detailTours = useMemo(() => {
    if (bookingDetails?.tours === undefined) return [];
    return [...bookingDetails.tours].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [bookingDetails?.tours]);

  const toursDisplayLabel = useMemo(() => {
    if (detailTours.length === 0) return booking?.tourTitle ?? booking?.tour?.title ?? '—';
    return detailTours
      .map((tour) =>
        language === 'en'
          ? (tour.title_en ?? tour.title ?? tour.title_es ?? '')
          : (tour.title_es ?? tour.title ?? tour.title_en ?? '')
      )
      .filter((title) => title !== '')
      .join(' • ');
  }, [detailTours, booking?.tourTitle, booking?.tour?.title, language]);

  const toursPriceBreakdown = useMemo(() => {
    return detailTours.map((tour) => {
      const raw = tour.priceForThisTour ?? tour.basePrice ?? 0;
      const parsed = typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
      return {
        id: tour.id,
        title:
          language === 'en'
            ? (tour.title_en ?? tour.title ?? tour.title_es ?? 'Tour')
            : (tour.title_es ?? tour.title ?? tour.title_en ?? 'Tour'),
        amount: Number.isFinite(parsed) ? parsed : 0,
      };
    });
  }, [detailTours, language]);

  const itineraryDays = useMemo(() => {
    if (bookingDetails?.itineraryByDay !== undefined && bookingDetails.itineraryByDay.length > 0) {
      return [...bookingDetails.itineraryByDay]
        .sort((a, b) => a.day - b.day)
        .map((dayData) => ({
          day: dayData.day,
          // Preserve backend-provided order as-is. For multi-tour itineraries,
          // sortOrder can restart per tour and re-sorting here breaks chronology.
          activities: [...dayData.activities],
        }));
    }

    const activities: BookingTourActivity[] = booking?.tour?.activities ?? [];
    if (activities.length === 0) return [];

    const dayMap = new Map<number, BookingTourActivity[]>();
    activities.forEach((act) => {
      const d = act.day ?? 1;
      if (!dayMap.has(d)) dayMap.set(d, []);
      const group = dayMap.get(d);
      if (group) group.push(act);
    });

    return [...dayMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([day, acts]) => ({ day, activities: acts.sort((a, b) => a.sortOrder - b.sortOrder) }));
  }, [bookingDetails?.itineraryByDay, booking?.tour?.activities]);

  // Tour-grouped itinerary: one entry per unique tour, activities in backend order
  const itineraryByTour = useMemo(() => {
    if (!bookingDetails?.itineraryByDay || bookingDetails.itineraryByDay.length === 0) return null;

    type ActivityWithDay = BookingDetailItineraryDay['activities'][number] & { day: number };
    const flat: ActivityWithDay[] = [...bookingDetails.itineraryByDay]
      .sort((a, b) => a.day - b.day)
      .flatMap((dayData) =>
        dayData.activities.map((act) => ({ ...act, day: act.day ?? dayData.day }))
      );

    const tourMap = new Map<
      string,
      { tourId: string; tourTitle: string; tourOrder: number; activities: ActivityWithDay[] }
    >();

    for (const act of flat) {
      const key = act.tourId ?? '__single__';
      if (!tourMap.has(key)) {
        const title =
          language === 'en'
            ? (act.tourNameEn ?? act.tourTitle ?? act.tourName ?? 'Tour')
            : (act.tourNameEs ?? act.tourTitle ?? act.tourName ?? 'Tour');
        tourMap.set(key, {
          tourId: key,
          tourTitle: title,
          tourOrder: act.tourOrder ?? 0,
          activities: [],
        });
      }
      tourMap.get(key)?.activities.push(act);
    }

    return [...tourMap.values()].sort((a, b) => a.tourOrder - b.tourOrder);
  }, [bookingDetails?.itineraryByDay, language]);

  const parsedTotalPrice = useMemo(() => {
    const raw = booking?.totalPrice ?? 0;
    return typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
  }, [booking?.totalPrice]);

  const parsedMinimumPayment = useMemo(() => {
    const raw = booking?.minimumPayment ?? 0;
    return typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
  }, [booking?.minimumPayment]);

  const parsedDepositAmount = useMemo(() => {
    const raw = booking?.depositAmount ?? parsedMinimumPayment;
    return typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
  }, [booking?.depositAmount, parsedMinimumPayment]);

  const parsedRemainingAfterDeposit = useMemo(() => {
    const raw = booking?.remainingAfterDeposit;
    if (raw === undefined || raw === null) return parsedTotalPrice - parsedDepositAmount;
    return typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
  }, [booking?.remainingAfterDeposit, parsedTotalPrice, parsedDepositAmount]);

  const parsedPaidAmountTotal = useMemo(() => {
    const raw = booking?.paidAmountTotal ?? 0;
    return typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
  }, [booking?.paidAmountTotal]);

  const parsedRemainingAmountTotal = useMemo(() => {
    const raw = booking?.remainingAmountTotal;
    if (raw === undefined || raw === null) return parsedTotalPrice - parsedPaidAmountTotal;
    return typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw);
  }, [booking?.remainingAmountTotal, parsedTotalPrice, parsedPaidAmountTotal]);

  const paymentProgress = useMemo(() => {
    const safeTotal = Math.max(0, parsedTotalPrice);
    const safePaid = Math.max(0, parsedPaidAmountTotal);
    if (safeTotal <= 0) {
      return booking?.status === 'paid' ? 100 : 0;
    }
    return Math.min(100, Math.max(0, Math.round((safePaid / safeTotal) * 100)));
  }, [parsedTotalPrice, parsedPaidAmountTotal, booking?.status]);

  const paymentMeta = useMemo(() => {
    if (paymentProgress >= 100) {
      return {
        accent: '#15803d',
        chipBg: '#dcfce7',
        chipColor: '#166534',
        label: language === 'en' ? 'Paid in full' : 'Pagado completo',
      };
    }
    if (paymentProgress > 0) {
      return {
        accent: '#c2410c',
        chipBg: '#ffedd5',
        chipColor: '#9a3412',
        label: language === 'en' ? 'Partially paid' : 'Pago parcial',
      };
    }
    return {
      accent: '#a16207',
      chipBg: '#fef9c3',
      chipColor: '#854d0e',
      label: language === 'en' ? 'Pending payment' : 'Pago pendiente',
    };
  }, [paymentProgress, language]);

  const getClientModalInitialData = (): ClientFormData | null => {
    if (editingClientIndex === null) return null;
    const c = formData.clients[editingClientIndex];
    if (!c) return null;
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

  const validate = (): boolean => {
    const errs: Partial<Record<string, string>> = {};
    const clientLabel = (i: number) => `${bookingsT.clientName} ${i + 1}`;

    if (!formData.startDate) {
      errs.startDate = `${bookingsT.startDate}: ${t('validation.required') ?? 'Required'}`;
    }
    if (!formData.endDate) {
      errs.endDate = `${bookingsT.endDate}: ${t('validation.required') ?? 'Required'}`;
    }

    // Validate dates
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        errs.endDate = bookingsT.endDateAfterStartDate ?? 'End date must be after start date';
      }
    }

    formData.clients.forEach((c, i) => {
      if (!c.clientName?.trim()) {
        errs[`clients.${i}.clientName`] =
          `${clientLabel(i)}: ${t('validation.required') ?? 'Required'}`;
      } else if (c.clientName.trim().length < 3) {
        errs[`clients.${i}.clientName`] = `${clientLabel(i)}: ${bookingsT.clientNameMinLength}`;
      } else if (c.clientName.trim().length > 100) {
        errs[`clients.${i}.clientName`] = `${clientLabel(i)}: ${bookingsT.clientNameMaxLength}`;
      }

      if (c.clientAge === undefined || c.clientAge === null) {
        errs[`clients.${i}.clientAge`] =
          `${clientLabel(i)} - ${bookingsT.clientAge}: ${t('validation.required') ?? 'Required'}`;
      } else if (c.clientAge < 0) {
        errs[`clients.${i}.clientAge`] = `${clientLabel(i)}: ${bookingsT.clientAgeMin}`;
      } else if (c.clientAge > 120) {
        errs[`clients.${i}.clientAge`] = `${clientLabel(i)}: ${bookingsT.clientAgeMax}`;
      }

      if ((clientNationalities[i] ?? c.countryCode ?? '') === '') {
        errs[`clients.${i}.nationality`] = `${clientLabel(i)}: ${bookingsT.selectNationality}`;
      }

      if (
        (clientNationalities[i] ?? c.countryCode ?? '') !== '' &&
        (c.identificationTypeId ?? '').trim() === ''
      ) {
        errs[`clients.${i}.identificationTypeId`] = `${clientLabel(i)}: ${bookingsT.selectIdType}`;
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
      errs['clients.minorWithoutAdult'] = bookingsT.clientAgeUnder18;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate() || !booking) {
      window.setTimeout(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setIsSubmitting(true);
    dispatch(setGlobalLoading({ isLoading: true, message: t('common.saving') ?? 'Guardando...' }));

    try {
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

      const clientsWithCountry: BookingClient[] = formData.clients.map((c, i) => ({
        ...c,
        countryCode: clientNationalities[i] ?? c.countryCode ?? '',
      }));

      const payload: Partial<Booking> = {
        startDate: buildDateTime(formData.startDate, rangeStart ?? '00:00'),
        endDate: buildDateTime(formData.endDate, rangeEnd ?? '00:00'),
        specialRequests: hasSpecialRequests ? formData.specialRequests : '',
        clients: clientsWithCountry,
        totalPrice: priceSummary.total,
      };

      const result = await updateBookingBusiness(booking.id, payload, token ?? undefined, language);

      dispatch(setGlobalLoading({ isLoading: false }));

      if (result.success) {
        onClose();
        onSuccess();
        dispatch(
          openModal({
            id: 'edit-booking-success',
            type: 'confirm',
            title: t('common.success') ?? 'Éxito',
            isOpen: true,
            data: {
              message:
                result.message ??
                (language === 'en'
                  ? 'Booking updated successfully'
                  : 'Reserva actualizada exitosamente'),
              icon: 'success',
            },
          } as Parameters<typeof openModal>[0])
        );
      } else {
        const errorMessage =
          result.message ??
          (language === 'en' ? 'Error updating booking' : 'Error al actualizar la reserva');
        setApiError(errorMessage);
        window.setTimeout(() => {
          errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } catch (err) {
      dispatch(setGlobalLoading({ isLoading: false }));
      console.error('Edit booking error:', err);
      setApiError(language === 'en' ? 'Error updating booking' : 'Error al actualizar la reserva');
      window.setTimeout(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !booking) return null;

  // 48h edit restriction: disable editing if first tour starts within 48 hours
  const isEditRestricted = (() => {
    if (readOnly) return false; // already read-only, skip check
    const firstTourDate = booking.tours?.[0]?.startDate ?? booking.startDate;
    const firstTourTime = booking.tours?.[0]?.startTime ?? '00:00';
    if (!firstTourDate) return false;
    return isWithinRestrictionWindow(firstTourDate, firstTourTime, 48);
  })();

  const readonlyStyle: CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#6b7280',
    fontSize: '0.875rem',
    cursor: 'not-allowed',
  };

  const labelStyle: CSSProperties = {
    display: 'block',
    marginBottom: 'var(--space-2)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-neutral-700)',
    fontSize: 'var(--text-sm)',
  };

  const sectionStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-4)',
  };

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
          maxWidth: 960,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '20px 24px 16px',
            borderBottom: '1px solid #e5e7eb',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
              {readOnly
                ? language === 'en'
                  ? 'View Booking'
                  : 'Ver Reserva'
                : language === 'en'
                  ? 'Edit Booking'
                  : 'Editar Reserva'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
              {bookingsT.confirmationCode}: {booking.confirmationCode}
            </p>
            {(() => {
              const statusColorMap: Record<string, { background: string; color: string }> = {
                requested: { background: '#dbeafe', color: '#1d4ed8' },
                confirmed: { background: '#e0e7ff', color: '#4338ca' },
                pending_payment: { background: '#fef9c3', color: '#a16207' },
                partially_paid: { background: '#ffedd5', color: '#c2410c' },
                paid: { background: '#dcfce7', color: '#15803d' },
                partial: { background: '#ffedd5', color: '#c2410c' },
                pending: { background: '#fef9c3', color: '#a16207' },
                cancelled: { background: '#fee2e2', color: '#b91c1c' },
                urgent: { background: '#fee2e2', color: '#b91c1c' },
              };
              const statusLabelMap: Record<string, string> = {
                requested: bookingsT.requested,
                confirmed: bookingsT.confirmed,
                pending_payment: bookingsT.pendingPayment,
                partially_paid: bookingsT.partiallyPaid,
                paid: bookingsT.paid,
                partial: bookingsT.partial,
                pending: bookingsT.pending,
                cancelled: bookingsT.cancelled,
                urgent: bookingsT.urgent,
              };
              const s = booking.status ?? '';
              const colors = statusColorMap[s] ?? { background: '#f3f4f6', color: '#374151' };
              return (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 6,
                    padding: '2px 10px',
                    borderRadius: 9999,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: colors.background,
                    color: colors.color,
                  }}
                >
                  {statusLabelMap[s] ?? s}
                </span>
              );
            })()}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginLeft: 'auto',
            }}
          >
            <div
              style={{
                minWidth: 240,
                maxWidth: 320,
                width: '100%',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background:
                  'linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)',
                padding: '12px 14px',
                boxShadow: '0 4px 14px rgba(15,23,42,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    color: '#475569',
                  }}
                >
                  {language === 'en' ? 'Payment Overview' : 'Resumen de pago'}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: paymentMeta.chipBg,
                    color: paymentMeta.chipColor,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {paymentMeta.label}
                </span>
              </div>

              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: '#e2e8f0',
                  overflow: 'hidden',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: `${paymentProgress}%`,
                    height: '100%',
                    background: paymentMeta.accent,
                    transition: 'width .25s ease',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#475569',
                  marginBottom: 8,
                }}
              >
                <span>{language === 'en' ? 'Progress' : 'Progreso'}</span>
                <strong style={{ color: paymentMeta.accent }}>{paymentProgress}%</strong>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 10px',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ color: '#64748b' }}>{language === 'en' ? 'Total' : 'Total'}</span>
                <strong style={{ textAlign: 'right', color: '#0f172a' }}>
                  {formatCurrency(parsedTotalPrice, booking.currency ?? 'MXN')}
                </strong>
                <span style={{ color: '#64748b' }}>{language === 'en' ? 'Paid' : 'Pagado'}</span>
                <strong style={{ textAlign: 'right', color: '#0f766e' }}>
                  {formatCurrency(parsedPaidAmountTotal, booking.currency ?? 'MXN')}
                </strong>
                <span style={{ color: '#64748b' }}>
                  {language === 'en' ? 'Remaining' : 'Restante'}
                </span>
                <strong style={{ textAlign: 'right', color: '#334155' }}>
                  {formatCurrency(
                    Math.max(0, parsedRemainingAmountTotal),
                    booking.currency ?? 'MXN'
                  )}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: '#9ca3af',
                padding: 4,
                borderRadius: 6,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-5)',
          }}
        >
          {/* Read-only info row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <span style={labelStyle}>{bookingsT.tour}</span>
              <div style={readonlyStyle}>{toursDisplayLabel}</div>
            </div>
            <div>
              <span style={labelStyle}>{bookingsT.currency}</span>
              <div style={readonlyStyle}>{booking.currency}</div>
            </div>
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

          {/* Read-only: Tour Activities / Itinerary */}
          {(() => {
            const DEFAULT_PALETTE = {
              headerBg: '#eff6ff',
              headerBorder: '#bfdbfe',
              headerText: '#1e40af',
              badgeBg: '#1d4ed8',
              badgeText: '#fff',
              timeBg: '#f0f9ff',
              timeBorder: '#bae6fd',
              timeText: '#0369a1',
            };
            const TOUR_PALETTE = [
              DEFAULT_PALETTE,
              {
                headerBg: '#f5f3ff',
                headerBorder: '#ddd6fe',
                headerText: '#5b21b6',
                badgeBg: '#7c3aed',
                badgeText: '#fff',
                timeBg: '#faf5ff',
                timeBorder: '#ddd6fe',
                timeText: '#6d28d9',
              },
              {
                headerBg: '#ecfdf5',
                headerBorder: '#a7f3d0',
                headerText: '#065f46',
                badgeBg: '#059669',
                badgeText: '#fff',
                timeBg: '#f0fdf4',
                timeBorder: '#bbf7d0',
                timeText: '#15803d',
              },
              {
                headerBg: '#fff7ed',
                headerBorder: '#fed7aa',
                headerText: '#9a3412',
                badgeBg: '#ea580c',
                badgeText: '#fff',
                timeBg: '#fff7ed',
                timeBorder: '#fdba74',
                timeText: '#c2410c',
              },
            ];

            // --- Tour-grouped path (new API with tourId on activities) ---
            if (itineraryByTour && itineraryByTour.length > 0) {
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
                    {bookingsT.tourItinerary}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {itineraryByTour.map((tourGroup, tourIdx) => {
                      const fallbackPalette = DEFAULT_PALETTE;
                      const palette =
                        TOUR_PALETTE[tourIdx % TOUR_PALETTE.length] ?? fallbackPalette;
                      const multiTour = itineraryByTour.length > 1;

                      // Detect day changes to render subtle day dividers within a tour
                      let lastDay: number | null = null;

                      return (
                        <div
                          key={tourGroup.tourId}
                          style={{
                            border: `1px solid ${palette.headerBorder}`,
                            borderRadius: 'var(--radius-lg, 10px)',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06)',
                          }}
                        >
                          {/* Tour header */}
                          <div
                            style={{
                              padding: '10px 14px',
                              background: palette.headerBg,
                              borderBottom: `1px solid ${palette.headerBorder}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            {multiTour && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: palette.badgeBg,
                                  color: palette.badgeText,
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {tourGroup.tourOrder || tourIdx + 1}
                              </span>
                            )}
                            {/* Map pin icon */}
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={palette.headerText}
                              strokeWidth="2"
                              style={{ flexShrink: 0 }}
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: palette.headerText,
                                lineHeight: 1.3,
                              }}
                            >
                              {tourGroup.tourTitle}
                            </span>
                            <span
                              style={{
                                marginLeft: 'auto',
                                fontSize: '0.7rem',
                                color: palette.headerText,
                                opacity: 0.65,
                                fontWeight: 500,
                              }}
                            >
                              {tourGroup.activities.length}{' '}
                              {language === 'en'
                                ? tourGroup.activities.length === 1
                                  ? 'activity'
                                  : 'activities'
                                : tourGroup.activities.length === 1
                                  ? 'actividad'
                                  : 'actividades'}
                            </span>
                          </div>

                          {/* Activities list */}
                          <div style={{ background: 'white' }}>
                            {tourGroup.activities.map((act, idx) => {
                              const showDayDivider = act.day !== lastDay;
                              lastDay = act.day;
                              const isLast = idx === tourGroup.activities.length - 1;

                              return (
                                <div key={act.id ?? `${tourGroup.tourId}-${idx}`}>
                                  {showDayDivider && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 14px',
                                        background: '#f9fafb',
                                        borderTop: idx > 0 ? '1px solid #f3f4f6' : undefined,
                                        borderBottom: '1px solid #f3f4f6',
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: 18,
                                          height: 18,
                                          borderRadius: '50%',
                                          background: '#e5e7eb',
                                          color: '#6b7280',
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                        }}
                                      >
                                        {act.day}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          color: '#6b7280',
                                          fontWeight: 600,
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.04em',
                                        }}
                                      >
                                        {language === 'en' ? `Day ${act.day}` : `Día ${act.day}`}
                                      </span>
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      padding: '9px 14px',
                                      borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                                      background: idx % 2 === 0 ? 'white' : '#fafbfc',
                                    }}
                                  >
                                    {/* Time chip */}
                                    <div
                                      style={{
                                        flexShrink: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        borderRadius: 9999,
                                        background: palette.timeBg,
                                        border: `1px solid ${palette.timeBorder}`,
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: palette.timeText,
                                        minWidth: 68,
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
                                    {/* Activity name */}
                                    <span
                                      style={{
                                        fontSize: '0.8rem',
                                        color: '#374151',
                                        fontWeight: 500,
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {language === 'en' ? act.activity_en : act.activity_es}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // --- Fallback: day-based rendering (legacy API without tourId) ---
            if (itineraryDays.length === 0) return null;

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
                  {bookingsT.tourItinerary}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {itineraryDays.map((dayData) => (
                    <div
                      key={`day-${dayData.day}`}
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
                          {dayData.day}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                          {bookingsT.dayLabel} {dayData.day}
                        </span>
                      </div>
                      <div>
                        {dayData.activities.map((act, idx) => (
                          <div
                            key={act.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 14px',
                              borderBottom:
                                idx < dayData.activities.length - 1 ? '1px solid #f3f4f6' : 'none',
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
                            <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>
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

          {/* Editable: Dates */}
          <div>
            <div style={sectionStyle}>
              <div>
                <label style={labelStyle}>
                  {bookingsT.startDate} <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={(e) => {
                      if (apiError !== null) setApiError(null);
                      const value = e.target.value;
                      if (tourDaysCount !== null && tourDaysCount > 0 && value !== '') {
                        const start = new Date(value);
                        start.setDate(start.getDate() + (tourDaysCount - 1));
                        const endDate = start.toISOString().split('T')[0] ?? '';
                        setFormData((p) => ({ ...p, startDate: value, endDate }));
                        clearErrors('startDate', 'endDate');
                      } else {
                        setFormData((p) => ({ ...p, startDate: value }));
                        if (errors.startDate !== undefined) {
                          clearErrors('startDate');
                        }
                      }
                    }}
                    error={errors.startDate}
                    disabled={readOnly}
                  />
                  <div
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: 9999,
                      whiteSpace: 'nowrap',
                      backgroundColor: hourRange !== null ? '#eff6ff' : '#f3f4f6',
                      border: `1px solid ${hourRange !== null ? '#bfdbfe' : '#e5e7eb'}`,
                      fontSize: '0.875rem',
                      color: hourRange !== null ? '#1d4ed8' : '#9ca3af',
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
                    {hourRange?.split(' - ')[0] ??
                      (language === 'en' ? 'No schedule' : 'Sin horario')}
                  </div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>
                  {bookingsT.endDate} <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={(e) => {
                      if (apiError !== null) setApiError(null);
                      setFormData((p) => ({ ...p, endDate: e.target.value }));
                      if (errors.endDate !== undefined) {
                        clearErrors('endDate');
                      }
                    }}
                    error={errors.endDate}
                    disabled={readOnly || (tourDaysCount !== null && tourDaysCount > 0)}
                  />
                  <div
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: 9999,
                      whiteSpace: 'nowrap',
                      backgroundColor: hourRange !== null ? '#eff6ff' : '#f3f4f6',
                      border: `1px solid ${hourRange !== null ? '#bfdbfe' : '#e5e7eb'}`,
                      fontSize: '0.875rem',
                      color: hourRange !== null ? '#1d4ed8' : '#9ca3af',
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
                    {hourRange?.split(' - ')[1] ??
                      (language === 'en' ? 'No schedule' : 'Sin horario')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editable: Clients */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                {bookingsT.clients}
              </h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleOpenAddClient}
                  className="modal-btn-add-client"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {bookingsT.addClient}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {formData.clients.map((client, index) => (
                <div
                  key={`ec-${index}`}
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
                            {bookingsT.primaryLabel ??
                              (language === 'en' ? 'Primary' : 'Principal')}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {client.clientAge}{' '}
                        {bookingsT.yearsOld ?? (language === 'en' ? 'years old' : 'años')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Edit button — oculto en modo solo lectura */}
                    {!readOnly && (
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
                          bookingsT.editClient ??
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
                    )}

                    {/* Delete button — solo para clientes no primarios y fuera de modo lectura */}
                    {!readOnly && client.isPrimary !== true && (
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
                        title={t('common.remove') ?? 'Eliminar'}
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
            </div>
          </div>

          {/* Price Summary */}
          {(priceSummary.validClients > 0 || toursPriceBreakdown.length > 0) && (
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
                {toursPriceBreakdown.length > 0 ? (
                  toursPriceBreakdown.map((tour) => (
                    <div
                      key={tour.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8125rem',
                        color: '#374151',
                      }}
                    >
                      <span>{tour.title}</span>
                      <span>{formatCurrency(tour.amount, booking?.currency ?? 'MXN')}</span>
                    </div>
                  ))
                ) : (
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
                      <strong>
                        {formatCurrency(priceSummary.basePrice, booking?.currency ?? 'MXN')}
                      </strong>{' '}
                      × {priceSummary.validClients}
                    </span>
                    <span>{formatCurrency(priceSummary.subtotal, booking?.currency ?? 'MXN')}</span>
                  </div>
                )}
                {toursPriceBreakdown.length === 0 && priceSummary.minorDiscount > 0 && (
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
                    <span>
                      -{formatCurrency(priceSummary.minorDiscount, booking?.currency ?? 'MXN')}
                    </span>
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
                  <span>
                    {formatCurrency(
                      toursPriceBreakdown.length > 0 ? parsedTotalPrice : priceSummary.total,
                      booking?.currency ?? 'MXN'
                    )}
                  </span>
                </div>
                {parsedMinimumPayment > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      color: '#0f766e',
                      fontWeight: 600,
                    }}
                  >
                    <span>{language === 'en' ? 'Pay now' : 'Pagar ahora'}</span>
                    <span>{formatCurrency(parsedMinimumPayment, booking?.currency ?? 'MXN')}</span>
                  </div>
                )}
                {parsedDepositAmount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      color: '#047857',
                      fontWeight: 600,
                    }}
                  >
                    <span>{language === 'en' ? 'Deposit amount' : 'Monto de anticipo'}</span>
                    <span>{formatCurrency(parsedDepositAmount, booking?.currency ?? 'MXN')}</span>
                  </div>
                )}
                {parsedRemainingAfterDeposit >= 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      color: '#6b7280',
                    }}
                  >
                    <span>
                      {language === 'en'
                        ? 'Remaining after deposit'
                        : 'Restante despues del anticipo'}
                    </span>
                    <span>
                      {formatCurrency(parsedRemainingAfterDeposit, booking?.currency ?? 'MXN')}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    color: '#0f766e',
                    fontWeight: 600,
                  }}
                >
                  <span>{language === 'en' ? 'Paid amount' : 'Monto pagado'}</span>
                  <span>{formatCurrency(parsedPaidAmountTotal, booking?.currency ?? 'MXN')}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    color: '#334155',
                    fontWeight: 600,
                  }}
                >
                  <span>{language === 'en' ? 'Total remaining' : 'Total restante'}</span>
                  <span>
                    {formatCurrency(
                      Math.max(0, parsedRemainingAmountTotal),
                      booking?.currency ?? 'MXN'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Client Form Modal */}
          <ClientFormModal
            isOpen={clientModalOpen}
            language={language}
            initialData={getClientModalInitialData()}
            showPrimary={true}
            isFirstClient={false}
            onSave={handleClientModalSave}
            onClose={() => setClientModalOpen(false)}
            translations={{
              clientName: bookingsT.clientName,
              clientAge: bookingsT.clientAge,
              clientNamePlaceholder: bookingsT.clientNamePlaceholder,
              clientAgePlaceholder: bookingsT.clientAgePlaceholder,
              selectNationality: bookingsT.selectNationality,
              selectIdType: bookingsT.selectIdType,
              enterClientId:
                bookingsT.enterClientId ?? (language === 'en' ? 'Enter ID' : 'Ingrese ID'),
              isPrimary: bookingsT.isPrimary,
              clientNameMinLength: bookingsT.clientNameMinLength,
              clientNameMaxLength: bookingsT.clientNameMaxLength,
              clientAgeMin: bookingsT.clientAgeMin,
              clientAgeMax: bookingsT.clientAgeMax,
              select: bookingsT.select,
              selectUser: bookingsT.selectUser,
              useSystemUser: bookingsT.useSystemUser,
              noUserSelected: bookingsT.noUserSelected,
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

          {/* Editable: Special Requests */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-neutral-700)',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={hasSpecialRequests}
                onChange={(e) => {
                  if (readOnly) return;
                  setHasSpecialRequests(e.target.checked);
                  if (!e.target.checked) setFormData((p) => ({ ...p, specialRequests: '' }));
                }}
                disabled={readOnly}
                style={{ width: 16, height: 16, cursor: readOnly ? 'default' : 'pointer' }}
              />
              {language === 'en' ? 'Special requests' : 'Pedidos especiales'}
            </label>
            {hasSpecialRequests && (
              <textarea
                value={formData.specialRequests}
                onChange={(e) => {
                  if (!readOnly) setFormData((p) => ({ ...p, specialRequests: e.target.value }));
                }}
                readOnly={readOnly}
                rows={3}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  color: '#111827',
                  resize: readOnly ? 'none' : 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  backgroundColor: readOnly ? '#f9fafb' : 'white',
                }}
                placeholder={
                  language === 'en'
                    ? 'e.g. dietary restrictions, preferred language...'
                    : 'ej. restricciones dietéticas, idioma preferido...'
                }
              />
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
                ⚠ {bookingsT.validationErrorsTitle ?? 'Por favor corrige los siguientes errores:'}
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

          {/* Footer */}
          <div className="modal-footer">
            {isEditRestricted && (
              <div
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#fef9c3',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  color: '#854d0e',
                  marginRight: 'auto',
                }}
              >
                {language === 'en'
                  ? '⚠️ Cannot edit booking within 48 hours of tour start'
                  : '⚠️ No se puede editar la reserva dentro de las 48 horas previas al tour'}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="modal-btn modal-btn-secondary"
            >
              {readOnly || isEditRestricted
                ? language === 'en'
                  ? 'Close'
                  : 'Cerrar'
                : t('common.cancel')}
            </button>
            {!readOnly && !isEditRestricted && (
              <button type="submit" disabled={isSubmitting} className="modal-btn modal-btn-primary">
                {isSubmitting
                  ? (t('common.saving') ?? 'Guardando...')
                  : language === 'en'
                    ? 'Save Changes'
                    : 'Guardar Cambios'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
