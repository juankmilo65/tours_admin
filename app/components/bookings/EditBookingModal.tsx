/**
 * EditBookingModal
 * Allows editing startDate, endDate, clients and specialRequests.
 * All other fields are shown read-only / disabled.
 */

import type { JSX, CSSProperties, FormEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
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

interface EditBookingModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditFormData {
  startDate: string;
  endDate: string;
  specialRequests: string;
  clients: BookingClient[];
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

  // Populate form when booking changes
  useEffect(() => {
    if (!booking) return;

    const clients: BookingClient[] = (booking.clients ?? []).map((c) => ({ ...c }));
    if (clients.length === 0) {
      clients.push({ clientName: '', clientAge: 0 });
    }

    setFormData({
      startDate: toDateLocal(booking.startDate),
      endDate: toDateLocal(booking.endDate),
      specialRequests: booking.specialRequests ?? '',
      clients,
    });
    setHasSpecialRequests((booking.specialRequests ?? '') !== '');
    setErrors({});
    setApiError(null);
  }, [booking]);

  // On modal open: load nationality dropdown + init per-client nationalities + preload ID types + set tour data
  useEffect(() => {
    if (!isOpen) return;

    void loadNationalities(language);

    if (booking?.clients) {
      // Initialise clientNationalities from the existing booking data
      const initNat: Record<number, string> = {};
      booking.clients.forEach((c, i) => {
        if (c.countryCode !== undefined && c.countryCode !== '') initNat[i] = c.countryCode;
      });
      setClientNationalities(initNat);

      // Preload identification types for every unique country in the booking
      const uniqueCodes = [...new Set(booking.clients.map((c) => c.countryCode).filter(Boolean))];
      uniqueCodes.forEach((code) => {
        if (code !== undefined && code !== '') void loadIdentificationTypes(code, language);
      });
    }

    // Use tour data directly from the booking response (no extra API calls)
    if (booking?.tour) {
      setHourRange(booking.tour.hourRange ?? null);
      setTourDaysCount(booking.tour.daysCount ?? null);
      setTourCountryCode(booking.tour.city?.countryId ?? '');
    } else {
      setHourRange(null);
      setTourDaysCount(null);
      setTourCountryCode('');
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
    };

    if (editingClientIndex !== null) {
      // Update existing
      setFormData((p) => ({
        ...p,
        clients: p.clients.map((c, i) => (i === editingClientIndex ? updatedClient : c)),
      }));
      setClientNationalities((p) => ({ ...p, [editingClientIndex]: data.countryCode }));
    } else {
      // Add new
      const newIndex = formData.clients.length;
      setFormData((p) => ({ ...p, clients: [...p.clients, updatedClient] }));
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

  const getClientModalInitialData = (): ClientFormData | null => {
    if (editingClientIndex === null) return null;
    const c = formData.clients[editingClientIndex];
    if (!c) return null;
    return {
      clientName: c.clientName,
      clientAge: c.clientAge,
      countryCode: clientNationalities[editingClientIndex] ?? c.countryCode ?? '',
      identificationTypeId: c.identificationTypeId ?? '',
      clientId: c.clientId ?? '',
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
            alignItems: 'center',
            padding: '20px 24px 16px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
              {language === 'en' ? 'Edit Booking' : 'Editar Reserva'}
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
              <div style={readonlyStyle}>{booking.tourTitle ?? booking.tour?.title ?? '—'}</div>
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
            const activities: BookingTourActivity[] = booking.tour?.activities ?? [];
            if (activities.length === 0) return null;

            // Group by day
            const dayMap = new Map<number, BookingTourActivity[]>();
            activities.forEach((act) => {
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
                  {bookingsT.tourItinerary}
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
                          {bookingsT.dayLabel} {dayNum}
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
                    disabled={tourDaysCount !== null && tourDaysCount > 0}
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
              <button type="button" onClick={handleOpenAddClient} className="modal-btn-add-client">
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

          {/* Client Form Modal */}
          <ClientFormModal
            isOpen={clientModalOpen}
            language={language}
            initialData={getClientModalInitialData()}
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
                  setHasSpecialRequests(e.target.checked);
                  if (!e.target.checked) setFormData((p) => ({ ...p, specialRequests: '' }));
                }}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              {language === 'en' ? 'Special requests' : 'Pedidos especiales'}
            </label>
            {hasSpecialRequests && (
              <textarea
                value={formData.specialRequests}
                onChange={(e) => setFormData((p) => ({ ...p, specialRequests: e.target.value }))}
                rows={3}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  color: '#111827',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
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
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="modal-btn modal-btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="modal-btn modal-btn-primary">
              {isSubmitting
                ? (t('common.saving') ?? 'Guardando...')
                : language === 'en'
                  ? 'Save Changes'
                  : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
