/**
 * CashPaymentModal
 * Confirmation modal to register a cash payment that settles a booking's
 * remaining balance. The displayed amount is informational only — the backend
 * computes the authoritative amount when transitioning the booking to 'paid'.
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { openModal } from '~/store/slices/uiSlice';
import { selectAuthToken } from '~/store/slices/authSlice';
import { registerCashPaymentBusiness } from '~/server/businessLogic/bookingsBusinessLogic';
import type { Booking } from '~/types/booking';

interface CashPaymentModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CashPaymentModal({
  isOpen,
  booking,
  onClose,
  onSuccess,
}: CashPaymentModalProps): JSX.Element | null {
  const { t, language } = useTranslation();
  const bookingsT = language === 'en' ? bookingEn : bookingEs;
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || booking === null) return null;

  // Informational balance to display; backend computes the authoritative amount.
  const parse = (v: number | string | undefined): number =>
    typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0;
  const balance =
    booking.remainingAfterDeposit !== undefined
      ? parse(booking.remainingAfterDeposit)
      : parse(booking.totalPrice) - parse(booking.depositAmount);

  const confirmCashPayment = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const result = await registerCashPaymentBusiness(booking.id, token ?? undefined, language);

      if (result.success) {
        onClose();
        onSuccess();
        dispatch(
          openModal({
            id: 'cash-payment-success',
            type: 'confirm',
            title: t('common.success') ?? 'Éxito',
            isOpen: true,
            data: {
              message: bookingsT.cashPayment.success,
              icon: 'success',
            },
          } as Parameters<typeof openModal>[0])
        );
      } else {
        dispatch(
          openModal({
            id: 'cash-payment-error',
            type: 'confirm',
            title: t('common.error') ?? 'Error',
            isOpen: true,
            data: {
              message:
                result.message ??
                (language === 'en'
                  ? 'Error registering cash payment'
                  : 'Error al registrar el pago en efectivo'),
              icon: 'alert',
            },
          } as Parameters<typeof openModal>[0])
        );
      }
    } catch (err) {
      console.error('Cash payment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
          width: 'min(460px, 96%)',
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
              {bookingsT.cashPayment.title}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
              {bookingsT.confirmationCode}: {booking.confirmationCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={bookingsT.cashPayment.cancel}
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

        {/* Body — balance to collect */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.82rem', fontWeight: 600, color: '#6b7280' }}>
            {bookingsT.cashPayment.balanceLabel}
          </p>
          <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 700, color: '#166534' }}>
            {booking.currency} {balance.toFixed(2)}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: '#9ca3af' }}>
            {bookingsT.cashPayment.balanceHint}
          </p>
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
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {bookingsT.cashPayment.cancel}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void confirmCashPayment()}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#16a34a',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting
              ? language === 'en'
                ? 'Processing…'
                : 'Procesando…'
              : bookingsT.cashPayment.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
