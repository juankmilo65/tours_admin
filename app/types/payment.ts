/**
 * Payment Types
 * Types for split payments and payment timeline
 */

export interface PaymentRecord {
  id: string;
  bookingId: string;
  type: 'deposit' | 'final' | 'full';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  refundedAt?: string;
  refundAmount?: number;
}

export interface PaymentCheckoutSession {
  url: string;
  sessionId: string;
  expiresAt: string;
}

export interface PaymentTimeline {
  type: 'deposit_paid' | 'final_payment_paid' | 'transferred_to_owner' | 'refunded';
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
}
