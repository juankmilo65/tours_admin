/**
 * Stripe Payments Breakdown Types
 * Types for Stripe payments report and statistics
 */

export interface StripePaymentDistribution {
  commissionAmount: string;
  stripeTransferId: string;
  transferStatus: 'completed' | 'pending' | 'failed';
  hostId: string;
}

export interface StripePaymentItem {
  paymentId: string;
  confirmationCode: string;
  tours: string[];
  amount: number;
  subtotal: number;
  taxAmount: number;
  currency: string;
  platformCommission: number;
  transferredToOwners: number;
  netPlatformEarning: number;
  commissionStatus: 'distributed' | 'pending' | 'failed';
  paymentType: 'final' | 'deposit' | null;
  isDeposit: boolean;
  stripePaymentIntentId: string;
  paidAt: string;
  distributions: StripePaymentDistribution[];
  myEarnings?: number; // For owner role - their personal earnings
}

export interface StripePaymentsSummary {
  totalReceived?: number; // Admin only
  totalTransferredToOwners?: number; // Admin only
  platformEarnings?: number; // Admin only
  totalEarnings?: number; // Owner only - their total earnings
}

export interface StripePaymentsBreakdown {
  success: boolean;
  summary: StripePaymentsSummary;
  breakdown: StripePaymentItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StripePaymentsFilters {
  from: string;
  to: string;
  ownerId?: string;
  commissionStatus?: 'distributed' | 'pending' | 'failed';
  paymentType?: 'final' | 'deposit';
  isDeposit?: boolean;
  page?: number;
  limit?: number;
}
