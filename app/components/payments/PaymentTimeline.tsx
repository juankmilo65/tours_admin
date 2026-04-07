/**
 * PaymentTimeline
 * Displays the payment timeline events for a booking
 */

import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEn, bookingEs } from '~/lib/i18n';
import { paymentsEn, paymentsEs } from '~/lib/i18n';
import type { PaymentTimeline as PaymentTimelineType } from '~/types/payment';

interface PaymentTimelineProps {
  events: PaymentTimelineType[];
  currency: string;
}

const EVENT_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  deposit_paid: { bg: '#dcfce7', border: '#86efac', icon: '💰' },
  final_payment_paid: { bg: '#dbeafe', border: '#93c5fd', icon: '✅' },
  transferred_to_owner: { bg: '#f3e8ff', border: '#c084fc', icon: '🏦' },
  refunded: { bg: '#fef9c3', border: '#fde047', icon: '↩️' },
};

function formatTimelineDate(iso: string, locale: string): string {
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

function getEventLabel(type: PaymentTimelineType['type'], bookingT: typeof bookingEn): string {
  const labels: Record<string, string> = {
    deposit_paid: bookingT.depositPaidEvent,
    final_payment_paid: bookingT.finalPaymentPaidEvent,
    transferred_to_owner: bookingT.transferredToOwnerEvent,
    refunded: bookingT.refundCompletedEvent,
  };
  return labels[type] ?? type;
}

export function PaymentTimeline({ events, currency }: PaymentTimelineProps): JSX.Element {
  const { language } = useTranslation();
  const bookingT = language === 'en' ? bookingEn : bookingEs;
  const paymentsT = language === 'en' ? paymentsEn : paymentsEs;

  if (events.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#9ca3af', fontSize: '14px' }}>
        {paymentsT.paymentPending}
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
        {paymentsT.paymentTimeline}
      </h4>

      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        {/* Timeline line */}
        <div
          style={{
            position: 'absolute',
            left: '8px',
            top: '0',
            bottom: '0',
            width: '2px',
            backgroundColor: '#e5e7eb',
          }}
        />

        {events.map((event, idx) => {
          const eventStyle = EVENT_STYLES[event.type] ?? {
            bg: '#f3f4f6',
            border: '#d1d5db',
            icon: '•',
          };

          return (
            <div
              key={idx}
              style={{
                position: 'relative',
                marginBottom: idx < events.length - 1 ? '16px' : 0,
              }}
            >
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '4px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: event.status === 'completed' ? '#22c55e' : '#fbbf24',
                  border: '2px solid white',
                  boxShadow: '0 0 0 2px #e5e7eb',
                }}
              />

              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: eventStyle.bg,
                  border: `1px solid ${eventStyle.border}`,
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{eventStyle.icon}</span>
                  <span>{getEventLabel(event.type, bookingT)}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {formatTimelineDate(event.date, language)} ·{' '}
                  <strong>
                    {currency} {event.amount.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
