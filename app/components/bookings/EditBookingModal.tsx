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
import { getCountriesDropdownBusiness } from '~/server/businessLogic/countriesBusinessLogic';
import { getIdentificationTypesDropdownBusiness } from '~/server/businessLogic/identificationTypesBusinessLogic';
import type { Booking, BookingClient } from '~/types/booking';
import type { CountryDropdown } from '~/types/country';
import type { IdentificationTypeDropdown } from '~/types/identificationType';

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

// Convert ISO to datetime-local value (strip seconds+ms, keep local offset)
function toDatetimeLocal(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  const [countries, setCountries] = useState<CountryDropdown[]>([]);
  const [identificationTypes, setIdentificationTypes] = useState<IdentificationTypeDropdown[]>([]);
  const [clientNationalities, setClientNationalities] = useState<Record<number, string>>({});

  // Populate form when booking changes
  useEffect(() => {
    if (!booking) return;

    const clients: BookingClient[] = (booking.clients ?? []).map((c) => ({ ...c }));
    if (clients.length === 0) {
      clients.push({ clientName: '', clientAge: 0 });
    }

    setFormData({
      startDate: toDatetimeLocal(booking.startDate),
      endDate: toDatetimeLocal(booking.endDate),
      specialRequests: booking.specialRequests ?? '',
      clients,
    });
    setHasSpecialRequests((booking.specialRequests ?? '') !== '');
    setErrors({});
  }, [booking]);

  // Fetch countries
  useEffect(() => {
    if (!isOpen) return;
    void getCountriesDropdownBusiness(language).then((res) => {
      const r = res as { success?: boolean; data?: CountryDropdown[] };
      if (r.success === true && r.data !== undefined) setCountries(r.data);
    });
  }, [isOpen, language]);

  const fetchIdTypes = async (countryCode: string): Promise<void> => {
    if (!countryCode) {
      setIdentificationTypes([]);
      return;
    }
    dispatch(setGlobalLoading({ isLoading: true }));
    try {
      const res = (await getIdentificationTypesDropdownBusiness(countryCode, true, language)) as {
        success?: boolean;
        data?: IdentificationTypeDropdown[];
      };
      setIdentificationTypes(res.success === true ? (res.data ?? []) : []);
    } finally {
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

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
    setIdentificationTypes([]);
    void fetchIdTypes(code);
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
      const clientsWithCountry: BookingClient[] = formData.clients.map((c, i) => ({
        ...c,
        countryCode: clientNationalities[i] ?? c.countryCode ?? '',
      }));

      const payload: Partial<Booking> = {
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
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
          <div style={sectionStyle}>
            <div>
              <span style={labelStyle}>{bookingsT.tour}</span>
              <div style={readonlyStyle}>{booking.tourTitle ?? booking.tour?.title ?? '—'}</div>
            </div>
            <div>
              <span style={labelStyle}>{bookingsT.customer}</span>
              <div style={readonlyStyle}>
                {(booking.user?.fullName ??
                  `${booking.user?.firstName ?? ''} ${booking.user?.lastName ?? ''}`.trim()) ||
                  '—'}
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div>
              <span style={labelStyle}>{bookingsT.status}</span>
              <div style={readonlyStyle}>{booking.status}</div>
            </div>
            <div>
              <span style={labelStyle}>{bookingsT.currency}</span>
              <div style={readonlyStyle}>{booking.currency}</div>
            </div>
          </div>

          {/* Editable: Dates */}
          <div style={sectionStyle}>
            <div>
              <label style={labelStyle}>
                {bookingsT.startDate} <span style={{ color: 'red' }}>*</span>
              </label>
              <Input
                type="datetime-local"
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
            </div>
            <div>
              <label style={labelStyle}>
                {bookingsT.endDate} <span style={{ color: 'red' }}>*</span>
              </label>
              <Input
                type="datetime-local"
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
              <button
                type="button"
                onClick={handleAddClient}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-primary-500)',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
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
                  <Select
                    options={[
                      { value: '', label: language === 'en' ? 'Select ID Type' : 'Tipo ID' },
                      ...identificationTypes.map((it) => ({
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              paddingTop: 16,
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 22px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#374151',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 22px',
                borderRadius: 8,
                border: 'none',
                background: isSubmitting ? '#9ca3af' : '#2563eb',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
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
