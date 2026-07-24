/**
 * BalancePaymentModal
 * Starts an ONLINE payment of a booking's remaining balance. The operator picks a
 * method (domestic card / international card / OXXO); the front builds the
 * feeBreakdown (net + IVA + gross-up fee — the customer covers the fee) and calls
 * complete-payment, then redirects to the Stripe link the backend returns.
 * The displayed balance is informational; the backend is the source of truth.
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEn, bookingEs } from '~/lib/i18n';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { openModal } from '~/store/slices/uiSlice';
import { selectAuthToken } from '~/store/slices/authSlice';
import { completePaymentBusiness } from '~/server/businessLogic/bookingsBusinessLogic';
import { computeStripeChargeBreakdown, resolveMethodFee } from '~/services/bookingService';
import { useCurrencyConfig } from '~/hooks/useCurrencyConfig';
import type { Booking } from '~/types/booking';

const TAX_RATE = 0.16;

type MethodKey = 'card-local' | 'card-foreign' | 'oxxo';

interface BalancePaymentModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
}

export function BalancePaymentModal({
  isOpen,
  booking,
  onClose,
}: BalancePaymentModalProps): JSX.Element | null {
  const { t, language } = useTranslation();
  const bookingsT = language === 'en' ? bookingEn : bookingEs;
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const [selected, setSelected] = useState<MethodKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { currencies: currencyConfigs } = useCurrencyConfig();

  if (!isOpen || booking === null) return null;

  const currencyConfig = currencyConfigs.find((c) => c.code === booking.currency);

  const parse = (v: number | string | undefined): number =>
    typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0;
  // Net (pre-IVA) balance to collect; the backend recomputes the authoritative amount.
  const net =
    booking.remainingAfterDeposit !== undefined
      ? parse(booking.remainingAfterDeposit)
      : parse(booking.totalPrice) - parse(booking.depositAmount);

  const methodFeeFor = (m: MethodKey) =>
    m === 'oxxo'
      ? resolveMethodFee(currencyConfig, 'oxxo', 'local')
      : resolveMethodFee(currencyConfig, 'card', m === 'card-foreign' ? 'foreign' : 'local');

  const decimals = currencyConfig?.decimals ?? 2;
  const money = (v: number): string => `${booking.currency} ${v.toFixed(decimals)}`;

  const methods: Array<{ key: MethodKey; label: string }> = [
    { key: 'card-local', label: bookingsT.balancePayment.methodLocal },
    { key: 'card-foreign', label: bookingsT.balancePayment.methodForeign },
    { key: 'oxxo', label: bookingsT.balancePayment.methodOxxo },
  ];

  const startPayment = async (): Promise<void> => {
    if (selected === null) return;
    setSubmitting(true);
    try {
      const methodFee = methodFeeFor(selected);
      if (currencyConfig === undefined || methodFee === undefined) {
        dispatch(
          openModal({
            id: 'balance-payment-error',
            type: 'confirm',
            title: t('common.error') ?? 'Error',
            isOpen: true,
            data: {
              message:
                language === 'en'
                  ? 'Payment configuration is not available yet. Please try again.'
                  : 'La configuración de pago aún no está disponible. Intenta de nuevo.',
              icon: 'alert',
            },
          } as Parameters<typeof openModal>[0])
        );
        return;
      }
      const feeBreakdown = computeStripeChargeBreakdown(
        net,
        TAX_RATE,
        methodFee.rate,
        methodFee.fixedFee
      );
      if (feeBreakdown.totalAmount < currencyConfig.minCharge) {
        dispatch(
          openModal({
            id: 'balance-payment-error',
            type: 'confirm',
            title: t('common.error') ?? 'Error',
            isOpen: true,
            data: {
              message:
                language === 'en'
                  ? `The amount to charge is below the minimum for ${currencyConfig.code} (${currencyConfig.minCharge.toFixed(decimals)}).`
                  : `El monto a cobrar es menor al mínimo para ${currencyConfig.code} (${currencyConfig.minCharge.toFixed(decimals)}).`,
              icon: 'alert',
            },
          } as Parameters<typeof openModal>[0])
        );
        return;
      }
      const result = await completePaymentBusiness(
        booking.id,
        feeBreakdown,
        token ?? undefined,
        language
      );
      if (result.success && result.url !== undefined && result.url !== '') {
        // Hand off to the Stripe-hosted payment page.
        window.location.href = result.url;
        return;
      }
      dispatch(
        openModal({
          id: 'balance-payment-error',
          type: 'confirm',
          title: t('common.error') ?? 'Error',
          isOpen: true,
          data: {
            message:
              result.message ??
              (language === 'en' ? 'Error starting the payment' : 'Error al iniciar el pago'),
            icon: 'alert',
          },
        } as Parameters<typeof openModal>[0])
      );
    } catch (err) {
      console.error('Balance payment error:', err);
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
          width: 'min(480px, 96%)',
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
              {bookingsT.balancePayment.title}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
              {bookingsT.confirmationCode}: {booking.confirmationCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={bookingsT.balancePayment.cancel}
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

        {/* Body — choose method */}
        <div style={{ padding: '18px 24px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.82rem', fontWeight: 600, color: '#6b7280' }}>
            {bookingsT.balancePayment.chooseMethod}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {methods.map((m) => {
              const mf = methodFeeFor(m.key);
              const breakdown =
                mf !== undefined
                  ? computeStripeChargeBreakdown(net, TAX_RATE, mf.rate, mf.fixedFee)
                  : undefined;
              const active = selected === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelected(m.key)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: active ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                    {m.label}
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#166534',
                      }}
                    >
                      {breakdown !== undefined ? money(breakdown.totalAmount) : '—'}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af' }}>
                      {breakdown !== undefined
                        ? `${bookingsT.stripeFee.comision} ${money(breakdown.feeAmount)}`
                        : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
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
            {bookingsT.balancePayment.cancel}
          </button>
          <button
            type="button"
            disabled={submitting || selected === null}
            onClick={() => void startPayment()}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: submitting || selected === null ? 'not-allowed' : 'pointer',
              opacity: submitting || selected === null ? 0.6 : 1,
            }}
          >
            {submitting
              ? language === 'en'
                ? 'Redirecting…'
                : 'Redirigiendo…'
              : bookingsT.balancePayment.pay}
          </button>
        </div>
      </div>
    </div>
  );
}
