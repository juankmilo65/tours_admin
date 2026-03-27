/**
 * BookingStatusModal
 * Shows the status history of a booking and allows transitioning to the next status
 * or cancelling of booking.
 */

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { openModal, setGlobalLoading } from '~/store/slices/uiSlice';
import { selectAuthToken, selectAuth } from '~/store/slices/authSlice';
import {
  updateBookingBusiness,
  getBookingStatusHistoryBusiness,
} from '~/server/businessLogic/bookingsBusinessLogic';
import { getNextBookingStatusBusiness } from '~/server/businessLogic/bookingStatusesBusinessLogic';
import type { Booking } from '~/types/booking';
import type { BookingStatusHistoryEntry } from '~/server/businessLogic/bookingsBusinessLogic';
import type { NextBookingStatus } from '~/types/bookingStatus';

interface BookingStatusModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Extended type for next status API response
interface NextStatusApiResponse {
  success: boolean;
  data: NextBookingStatus | null;
  isOutOfFlow?: boolean;
  message?: string;
}

// Map status codes -> colour pair [bg, text]
const STATUS_COLORS: Record<string, [string, string]> = {
  requested: ['#dbeafe', '#1d4ed8'],
  confirmed: ['#d1fae5', '#065f46'],
  pending_payment: ['#fef9c3', '#854d0e'],
  partially_paid: ['#ffedd5', '#9a3412'],
  paid: ['#dcfce7', '#166534'],
  cancelled: ['#fee2e2', '#991b1b'],
};

function statusColor(code: string): [string, string] {
  return STATUS_COLORS[code] ?? ['#f3f4f6', '#374151'];
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
export function BookingStatusModal({
  isOpen,
  booking,
  onClose,
  onSuccess,
}: BookingStatusModalProps): JSX.Element | null {
  const { t, language } = useTranslation();
  const bookingsT = language === 'en' ? bookingEn : bookingEs;
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const auth = useAppSelector(selectAuth);
  const isAdmin = auth.user?.role === 'admin';
  const isOwner = auth.user?.role === 'owner';

  const [nextStatus, setNextStatus] = useState<NextBookingStatus | null>(null);
  const [nextStatusError, setNextStatusError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [history, setHistory] = useState<BookingStatusHistoryEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch next status AND history concurrently; render content only when both resolve
  useEffect(() => {
    if (!isOpen || !booking) return;
    setNextStatus(null);
    setNextStatusError(null);
    setHistory([]);
    setLoadingData(true);

    const currentCode = booking.status;

    // Solo consultar el próximo estado si no es 'cancelled' o 'confirmed'
    const needsNextStatus =
      Boolean(currentCode) && currentCode !== 'cancelled' && currentCode !== 'confirmed';

    const fetchNextStatus = needsNextStatus
      ? getNextBookingStatusBusiness(currentCode, token ?? undefined, language)
      : Promise.resolve({ success: false, data: null });

    const fetchHistory = getBookingStatusHistoryBusiness(booking.id, token ?? undefined, language);

    void Promise.all([fetchNextStatus, fetchHistory])
      .then(
        ([nextRes, historyRes]: [
          NextStatusApiResponse,
          { success: boolean; data: { history: BookingStatusHistoryEntry[] } | null },
        ]) => {
          if (nextRes.success && nextRes.data) {
            setNextStatus(nextRes.data);
          } else if (nextRes.isOutOfFlow === true) {
            setNextStatusError(
              nextRes.message ??
                (language === 'en'
                  ? 'This status is outside of main flow.'
                  : 'Este estado está fuera del flujo principal.')
            );
          } else if (nextRes.data === null && nextRes.success) {
            setNextStatusError(
              language === 'en'
                ? 'This booking is already at the final status.'
                : 'La reserva ya está en el estado final del flujo.'
            );
          } else if (!nextRes.success) {
            setNextStatusError(
              nextRes.message ??
                (language === 'en'
                  ? 'Error fetching next status.'
                  : 'Error obteniendo el siguiente estado.')
            );
          }
          if (historyRes.success && historyRes.data !== null) {
            setHistory(historyRes.data.history);
          }
        }
      )
      .finally(() => {
        setLoadingData(false);
      });
  }, [isOpen, booking, token, language]);

  const changeStatus = async (statusCode: string) => {
    if (!booking) return;
    setIsTransitioning(true);
    dispatch(setGlobalLoading({ isLoading: true, message: t('common.saving') ?? 'Guardando...' }));

    try {
      const result = await updateBookingBusiness(
        booking.id,
        { status: statusCode } as Partial<Booking>,
        token ?? undefined,
        language
      );

      dispatch(setGlobalLoading({ isLoading: false }));

      if (result.success) {
        onClose();
        onSuccess();
        dispatch(
          openModal({
            id: 'status-change-success',
            type: 'confirm',
            title: t('common.success') ?? 'Éxito',
            isOpen: true,
            data: {
              message:
                result.message ??
                (language === 'en'
                  ? 'Status updated successfully'
                  : 'Estado actualizado exitosamente'),
              icon: 'success',
            },
          } as Parameters<typeof openModal>[0])
        );
      } else {
        dispatch(
          openModal({
            id: 'status-change-error',
            type: 'confirm',
            title: t('common.error') ?? 'Error',
            isOpen: true,
            data: {
              message:
                result.message ??
                (language === 'en' ? 'Error updating status' : 'Error al actualizar el estado'),
              icon: 'alert',
            },
          } as Parameters<typeof openModal>[0])
        );
      }
    } catch (err) {
      dispatch(setGlobalLoading({ isLoading: false }));
      console.error('Status change error:', err);
    } finally {
      setIsTransitioning(false);
    }
  };

  if (!isOpen || !booking) return null;

  const isActiveStatus: boolean = booking.status !== null && booking.status !== 'cancelled';
  const tourIsFuture: boolean =
    booking.startDate !== undefined &&
    booking.startDate !== null &&
    new Date(booking.startDate) > new Date();

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(520px, 96%)',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 14px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
              {language === 'en' ? 'Booking Status' : 'Estado de la Reserva'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
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
              fontSize: '1.2rem',
              color: '#9ca3af',
              padding: 4,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Status timeline / loading spinner */}
        <div style={{ padding: '16px 24px', maxHeight: '50vh', overflowY: 'auto' }}>
          {loadingData ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 0',
                gap: 12,
              }}
            >
              {/* Spinning ring */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '3px solid #e5e7eb',
                  borderTopColor: '#2563eb',
                  animation: 'spin 0.75s linear infinite',
                }}
              />
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>
                {language === 'en' ? 'Loading history…' : 'Cargando historial…'}
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {history.map((item, idx) => {
                const [bg, fg] = statusColor(item.statusCode);
                const isLast = idx === history.length - 1;
                const label = language === 'en' ? item.statusName_en : item.statusName_es;
                return (
                  <div
                    key={`${item.statusCode}-${idx}`}
                    style={{ display: 'flex', gap: 14, position: 'relative' }}
                  >
                    {/* line */}
                    {!isLast && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 15,
                          top: 32,
                          width: 2,
                          height: 'calc(100% - 16px)',
                          background: '#e5e7eb',
                        }}
                      />
                    )}
                    {/* dot */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isLast ? `0 0 0 3px ${bg}` : 'none',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {isLast ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={fg}
                          strokeWidth="2.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: fg }} />
                      )}
                    </div>
                    {/* content */}
                    <div style={{ paddingBottom: 20 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: bg,
                          color: fg,
                        }}
                      >
                        {label}
                      </span>
                      {item.amount !== null && item.amount !== undefined && (
                        <p
                          style={{
                            margin: '4px 0 0',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: fg,
                            background: bg,
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-MX', {
                            style: 'currency',
                            currency: item.currency ?? 'MXN',
                            minimumFractionDigits: 2,
                          }).format(item.amount)}
                        </p>
                      )}
                      <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#9ca3af' }}>
                        {formatDate(item.changedAt, language)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '14px 24px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          {/* Cancel button – only if booking is active AND tour hasn't started yet */}
          {!loadingData && isActiveStatus && tourIsFuture && (
            <button
              type="button"
              disabled={isTransitioning}
              onClick={() => void changeStatus('cancelled')}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #fca5a5',
                background: '#fff1f2',
                color: '#dc2626',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isTransitioning ? 'not-allowed' : 'pointer',
                opacity: isTransitioning ? 0.6 : 1,
              }}
            >
              {bookingsT.cancelBooking}
            </button>
          )}

          {/* Mensajes de error, fuera de flujo o estado final, pero NO mostrar si es 'confirmed' y no se consultó siguiente estado */}
          {!loadingData && nextStatusError && booking.status !== 'confirmed' && (
            <div
              style={{
                flex: 1,
                color: '#b91c1c',
                background: '#fee2e2',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: '0.92rem',
                marginRight: 'auto',
                marginTop: 4,
                marginBottom: 4,
                maxWidth: '100%',
              }}
            >
              {nextStatusError}
            </div>
          )}
          {/* Next status button: admin y owner pueden confirmar; solo owner puede poner pending_payment */}
          {!loadingData &&
          nextStatus &&
          !nextStatusError &&
          isActiveStatus &&
          nextStatus.nextStatusName &&
          (booking.status === 'pending_confirmation' || booking.status === 'requested') &&
          ((isAdmin && nextStatus.nextStatusCode === 'confirmed') ||
            (isOwner &&
              (nextStatus.nextStatusCode === 'confirmed' ||
                nextStatus.nextStatusCode === 'pending_payment'))) ? (
            <button
              type="button"
              disabled={isTransitioning}
              onClick={() => void changeStatus(nextStatus.nextStatusCode)}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#2563eb',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isTransitioning ? 'not-allowed' : 'pointer',
                opacity: isTransitioning ? 0.6 : 1,
              }}
            >
              {language === 'en'
                ? `→ ${nextStatus.nextStatusName?.en ?? ''}`
                : `→ ${nextStatus.nextStatusName?.es ?? ''}`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
