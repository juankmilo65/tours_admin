/**
 * Client-side payment service
 * Handles payment flow logic
 */

import type { PaymentTimeline } from '~/types/payment';

export interface PaymentStatusCheckResult {
  status: 'pending' | 'completed' | 'failed' | 'error';
  lastUpdated: string;
  payment?: { status: string };
}

/**
 * Poll payment status until completion or timeout
 */
export const pollPaymentStatus = (
  bookingId: string,
  getPaymentStatus: (bookingId: string) => Promise<{ status: string }>,
  options = { maxAttempts: 12, intervalMs: 5000 }
): Promise<PaymentStatusCheckResult> => {
  let attempts = 0;

  return new Promise((resolve) => {
    const interval = window.setInterval(() => {
      attempts++;

      void (async () => {
        try {
          const payment = await getPaymentStatus(bookingId);

          if (payment.status === 'completed' || payment.status === 'paid') {
            window.clearInterval(interval);
            resolve({
              status: 'completed',
              lastUpdated: new Date().toISOString(),
              payment,
            });
            return;
          }

          if (payment.status === 'failed') {
            window.clearInterval(interval);
            resolve({
              status: 'failed',
              lastUpdated: new Date().toISOString(),
              payment,
            });
            return;
          }

          if (attempts >= options.maxAttempts) {
            window.clearInterval(interval);
            resolve({
              status: 'pending',
              lastUpdated: new Date().toISOString(),
              payment,
            });
            return;
          }
        } catch (error) {
          console.error('Error polling payment status:', error);
          if (attempts >= options.maxAttempts) {
            window.clearInterval(interval);
            resolve({
              status: 'error',
              lastUpdated: new Date().toISOString(),
            });
          }
        }
      })();
    }, options.intervalMs);
  });
};

/**
 * Format payment timeline events for display
 */
export const formatPaymentTimeline = (booking: {
  depositPaid?: boolean;
  depositPaidAt?: string;
  depositAmount?: number;
  finalPaymentPaid?: boolean;
  finalPaymentPaidAt?: string;
  finalPaymentAmount?: number;
  transferredToOwner?: boolean;
  transferredAt?: string;
  totalPrice?: number | string;
}): PaymentTimeline[] => {
  const timeline: PaymentTimeline[] = [];

  if (
    booking.depositPaid === true &&
    booking.depositPaidAt !== null &&
    booking.depositPaidAt !== undefined &&
    booking.depositPaidAt !== ''
  ) {
    timeline.push({
      type: 'deposit_paid',
      date: booking.depositPaidAt,
      amount: booking.depositAmount ?? 0,
      status: 'completed',
    });
  }

  if (
    booking.finalPaymentPaid === true &&
    booking.finalPaymentPaidAt !== null &&
    booking.finalPaymentPaidAt !== undefined &&
    booking.finalPaymentPaidAt !== ''
  ) {
    timeline.push({
      type: 'final_payment_paid',
      date: booking.finalPaymentPaidAt,
      amount: booking.finalPaymentAmount ?? 0,
      status: 'completed',
    });
  }

  if (
    booking.transferredToOwner === true &&
    booking.transferredAt !== null &&
    booking.transferredAt !== undefined &&
    booking.transferredAt !== ''
  ) {
    timeline.push({
      type: 'transferred_to_owner',
      date: booking.transferredAt,
      amount: typeof booking.totalPrice === 'number' ? booking.totalPrice : 0,
      status: 'completed',
    });
  }

  return timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
