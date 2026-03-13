/**
 * EditBookingModal
 * Allows editing startDate, endDate, clients and specialRequests.
 * All other fields are shown read-only / disabled.
 */

import type { JSX, CSSProperties, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';
import { Input } from '~/components/ui/Input';
import Select from '~/components/ui/Select';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { openModal, setGlobalLoading } from '~/store/slices/uiSlice';
import { selectAuthToken } from '~/store/slices/authSlice';
import { updateBookingBusiness } from '~/server/businessLogic/bookingsBusinessLogic';
import { getTourHourRangeBusiness } from '~/server/businessLogic/toursBusinessLogic';
import {
  useDropdownCache,
  useCachedNationalities,
  useAllCachedIdentificationTypes,
} from '~/hooks/useDropdownCache';
import type { Booking, BookingClient } from '~/types/booking';

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
  const [hourRange, setHourRange] = useState<string | null>(null);
  const [isLoadingHourRange, setIsLoadingHourRange] = useState(false);

  const [clientNationalities, setClientNationalities] = useState<Record<number, string>>({});

  // Cache-first dropdown loaders
  const { loadNationalities, loadIdentificationTypes } = useDropdownCache();
  const countries = useCachedNationalities(language);
  const allIdTypesByCountry = useAllCachedIdentificationTypes();

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
  }, [booking]);

  // On modal open: load nationality dropdown + init per-client nationalities + preload ID types
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

    // Fetch hour range for the tour
    if (booking?.tourId !== undefined && booking.tourId !== '' && token !== null && token !== '') {
      setIsLoadingHourRange(true);
      void getTourHourRangeBusiness(booking.tourId, token, language)
        .then((result) => {
          setHourRange(result.success ? (result.data?.hourRange ?? null) : null);
        })
        .catch(() => setHourRange(null))
        .finally(() => setIsLoadingHourRange(false));
    } else {
      setHourRange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking]);

  const handleClientChange = (
    index: number,
    field: keyof BookingClient,
    value: string | number
  ): void => {
    setFormData((prev) => {
      const updated = [...prev.clients];
      const cur = updated[index];
      if (cur !== undefined) {
        updated[index] = { ...cur, [field]: field === 'clientAge' ? Number(value) : value };
      }
      return { ...prev, clients: updated };
    });
    const key = `clients.${index}.${field}`;
    if (errors[key] !== undefined) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const handleNationalityChange = (index: number, code: string): void => {
    setClientNationalities((p) => ({ ...p, [index]: code }));
    handleClientChange(index, 'identificationTypeId' as keyof BookingClient, '');
    if (code) void loadIdentificationTypes(code, language);
    // Clear nationality error
    setErrors((p) => ({ ...p, [`clients.${index}.nationality`]: undefined }));
  };

  const handleAddClient = (): void => {
    setFormData((p) => ({
      ...p,
      clients: [...p.clients, { clientName: '', clientAge: 0 }],
    }));
  };

  const handleRemoveClient = (index: number): void => {
    if (formData.clients.length <= 1) return;
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

  const validate = (): boolean => {
    const errs: Partial<Record<string, string>> = {};
    if (!formData.startDate) errs.startDate = t('validation.required') ?? 'Required';
    if (!formData.endDate) errs.endDate = t('validation.required') ?? 'Required';
    formData.clients.forEach((c, i) => {
      if (!c.clientName?.trim()) {
        errs[`clients.${i}.clientName`] = t('validation.required') ?? 'Required';
      }
      if (!c.clientAge || c.clientAge < 0) {
        errs[`clients.${i}.clientAge`] = t('validation.required') ?? 'Required';
      }
      if ((clientNationalities[i] ?? c.countryCode ?? '') === '') {
        errs[`clients.${i}.nationality`] =
          bookingsT.selectNationality ?? 'Seleccionar nacionalidad';
      }
      if (
        (clientNationalities[i] ?? c.countryCode ?? '') !== '' &&
        (c.identificationTypeId ?? '').trim() === ''
      ) {
        errs[`clients.${i}.identificationTypeId`] =
          bookingsT.selectIdType ?? 'Seleccionar tipo de ID';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate() || !booking) return;

    setIsSubmitting(true);
    dispatch(setGlobalLoading({ isLoading: true, message: t('common.saving') ?? 'Guardando...' }));

    try {
      const buildDateTime = (date: string, time: string): string => {
        if (!date) return '';
        const d = new Date(`${date}T${time}:00`);
        return isNaN(d.getTime()) ? `${date}T${time}:00` : d.toISOString();
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
        dispatch(
          openModal({
            id: 'edit-booking-error',
            type: 'confirm',
            title: t('common.error') ?? 'Error',
            isOpen: true,
            data: {
              message:
                result.message ??
                (language === 'en' ? 'Error updating booking' : 'Error al actualizar la reserva'),
              icon: 'alert',
            },
          } as Parameters<typeof openModal>[0])
        );
      }
    } catch (err) {
      dispatch(setGlobalLoading({ isLoading: false }));
      console.error('Edit booking error:', err);
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
                      setFormData((p) => ({ ...p, startDate: e.target.value }));
                      if (errors.startDate !== undefined) {
                        setErrors((p) => ({ ...p, startDate: undefined }));
                      }
                    }}
                    required
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
                      backgroundColor: isLoadingHourRange
                        ? '#f3f4f6'
                        : hourRange !== null
                          ? '#eff6ff'
                          : '#f3f4f6',
                      border: `1px solid ${
                        isLoadingHourRange ? '#e5e7eb' : hourRange !== null ? '#bfdbfe' : '#e5e7eb'
                      }`,
                      fontSize: '0.875rem',
                      color: isLoadingHourRange
                        ? '#9ca3af'
                        : hourRange !== null
                          ? '#1d4ed8'
                          : '#9ca3af',
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
                      setFormData((p) => ({ ...p, endDate: e.target.value }));
                      if (errors.endDate !== undefined) {
                        setErrors((p) => ({ ...p, endDate: undefined }));
                      }
                    }}
                    required
                    error={errors.endDate}
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
                      backgroundColor: isLoadingHourRange
                        ? '#f3f4f6'
                        : hourRange !== null
                          ? '#eff6ff'
                          : '#f3f4f6',
                      border: `1px solid ${
                        isLoadingHourRange ? '#e5e7eb' : hourRange !== null ? '#bfdbfe' : '#e5e7eb'
                      }`,
                      fontSize: '0.875rem',
                      color: isLoadingHourRange
                        ? '#9ca3af'
                        : hourRange !== null
                          ? '#1d4ed8'
                          : '#9ca3af',
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
              <button type="button" onClick={handleAddClient} className="modal-btn-add-client">
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

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {/* Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 90px 170px 150px 140px 40px',
                  gap: 'var(--space-3)',
                  padding: '10px 14px',
                  background: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#6b7280',
                }}
              >
                <div>#</div>
                <div>{bookingsT.clientName}</div>
                <div>{bookingsT.clientAge}</div>
                <div>{bookingsT.nationality}</div>
                <div>{language === 'en' ? 'ID Type' : 'Tipo ID'}</div>
                <div>{language === 'en' ? 'Client ID' : 'ID Cliente'}</div>
                <div />
              </div>

              {formData.clients.map((client, index) => (
                <div
                  key={`ec-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 90px 170px 150px 140px 40px',
                    gap: 'var(--space-3)',
                    padding: '10px 14px',
                    alignItems: 'center',
                    borderBottom:
                      index < formData.clients.length - 1 ? '1px solid #e5e7eb' : 'none',
                    background: index % 2 === 0 ? 'white' : '#f9fafb',
                  }}
                >
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    {index + 1}
                  </div>
                  <Input
                    type="text"
                    value={client.clientName}
                    onChange={(e) => handleClientChange(index, 'clientName', e.target.value)}
                    placeholder={bookingsT.clientNamePlaceholder}
                    error={errors[`clients.${index}.clientName`]}
                    required
                  />
                  <Input
                    type="number"
                    value={client.clientAge}
                    onChange={(e) => handleClientChange(index, 'clientAge', e.target.value)}
                    placeholder={bookingsT.clientAgePlaceholder}
                    min={0}
                    max={120}
                    error={errors[`clients.${index}.clientAge`]}
                    required
                  />
                  <div>
                    <Select
                      options={[
                        { value: '', label: bookingsT.selectNationality },
                        ...countries.map((c) => ({
                          value: c.code,
                          label:
                            language === 'en'
                              ? (c.nationality_en ?? c.name_en)
                              : (c.nationality_es ?? c.name_es),
                        })),
                      ]}
                      value={clientNationalities[index] ?? client.countryCode ?? ''}
                      onChange={(v) => handleNationalityChange(index, v)}
                      placeholder={bookingsT.selectNationality}
                      id={`edit-nat-${index}`}
                    />
                    {errors[`clients.${index}.nationality`] !== undefined && (
                      <p
                        style={{
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-error-500)',
                          marginTop: '0.25rem',
                        }}
                      >
                        {errors[`clients.${index}.nationality`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <Select
                      options={[
                        { value: '', label: language === 'en' ? 'Select ID Type' : 'Tipo ID' },
                        ...(
                          allIdTypesByCountry[
                            clientNationalities[index] ?? client.countryCode ?? ''
                          ] ?? []
                        ).map((it) => ({
                          value: it.id,
                          label: language === 'en' ? it.name_en : it.name_es,
                        })),
                      ]}
                      value={client.identificationTypeId ?? ''}
                      onChange={(v) =>
                        handleClientChange(index, 'identificationTypeId' as keyof BookingClient, v)
                      }
                      placeholder={language === 'en' ? 'Select ID Type' : 'Tipo ID'}
                      id={`edit-idtype-${index}`}
                      disabled={(clientNationalities[index] ?? client.countryCode ?? '') === ''}
                    />
                    {errors[`clients.${index}.identificationTypeId`] !== undefined && (
                      <p
                        style={{
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-error-500)',
                          marginTop: '0.25rem',
                        }}
                      >
                        {errors[`clients.${index}.identificationTypeId`]}
                      </p>
                    )}
                  </div>
                  <Input
                    type="text"
                    value={client.clientId ?? ''}
                    onChange={(e) =>
                      handleClientChange(index, 'clientId' as keyof BookingClient, e.target.value)
                    }
                    placeholder={language === 'en' ? 'ID' : 'ID'}
                  />
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveClient(index)}
                      disabled={formData.clients.length <= 1}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        border: 'none',
                        cursor: formData.clients.length <= 1 ? 'not-allowed' : 'pointer',
                        background:
                          formData.clients.length <= 1 ? '#f3f4f6' : 'rgba(239,68,68,0.1)',
                        color: formData.clients.length <= 1 ? '#d1d5db' : '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
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
            </div>
          </div>

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
